import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildAgentGraph, Command, createCheckpointer, HumanMessage } from '@banking-crm/ai';
import type { CompiledAgentGraph } from '@banking-crm/ai';
import { defaultScoringConfig } from '@banking-crm/types';
import type {
  Customer,
  GeneratedMessage,
  ScoredCustomer,
  ScoringRulesConfig,
  SpendingInsight,
  TransactionSummary,
} from '@banking-crm/types';

import { PrismaService } from '../../database/prisma.service';
import { CrmSessionGateway } from '../crm-session/crm-session.gateway';

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private graph!: CompiledAgentGraph;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CrmSessionGateway,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const dbUrl = this.config.getOrThrow<string>('DATABASE_URL');
    const openaiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
    const checkpointer = await createCheckpointer(dbUrl);

    this.graph = buildAgentGraph({
      prisma: this.prisma as Parameters<typeof buildAgentGraph>[0]['prisma'],
      openaiApiKey: openaiKey,
      checkpointer,
      emitTool: (sessionId, tool, status, detail, durationMs) => {
        const timestamp = Date.now();
        if (status === 'start') {
          this.gateway.emitToolStart(sessionId, { sessionId, tool, timestamp });
        } else if (status === 'done') {
          this.gateway.emitToolDone(sessionId, {
            sessionId,
            tool,
            durationMs: durationMs ?? 0,
            resultSummary: detail ?? '',
            timestamp,
          });
        } else {
          this.gateway.emitToolError(sessionId, {
            sessionId,
            tool,
            error: detail ?? 'Unknown error',
            timestamp,
          });
        }
      },
      getScoringConfig: async (tenantId) => {
        const configRow = await this.prisma.scoringConfig.findUnique({ where: { tenantId } });
        return (configRow?.rules as unknown as ScoringRulesConfig) ?? defaultScoringConfig;
      },
    });

    this.logger.log('Agent graph initialized');
  }

  async processMessage(
    sessionId: string,
    tenantId: string,
    _messageId: string,
    content: string,
  ): Promise<void> {
    const graphConfig = { configurable: { thread_id: sessionId } };

    const scoringConfigRow = await this.prisma.scoringConfig.findUnique({ where: { tenantId } });
    const scoringConfig =
      (scoringConfigRow?.rules as unknown as ScoringRulesConfig) ?? defaultScoringConfig;

    const currentState = await this.graph.getState(graphConfig);
    const isNew = !currentState.values['sessionId'];

    const initialInput = isNew
      ? { sessionId, tenantId, scoringConfig, messages: [new HumanMessage(content)] }
      : { messages: [new HumanMessage(content)] };

    try {
      for await (const _chunk of await this.graph.stream(initialInput, {
        ...graphConfig,
        streamMode: 'values',
      })) {
        // consume stream
      }

      await this.emitFinalMessage(sessionId);
    } catch (err: unknown) {
      if (this.isInterruptError(err)) {
        const state = await this.graph.getState(graphConfig);
        const scoredCustomers =
          (state.values['scoredCustomers'] as Array<{ qualifies: boolean }> | undefined) ?? [];
        const qualifiedCount = scoredCustomers.filter((s) => s.qualifies).length;
        this.gateway.emitAwaitingApproval(sessionId, {
          sessionId,
          qualifiedCount,
          timestamp: Date.now(),
        });
        return;
      }

      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[session:${sessionId}] Error: ${msg}`);
      this.gateway.emitSessionError(sessionId, { sessionId, error: msg, timestamp: Date.now() });
    }
  }

  async approveMessages(sessionId: string): Promise<void> {
    const graphConfig = { configurable: { thread_id: sessionId } };
    try {
      // Resume from interrupt() checkpoint in generate_messages tool.
      for await (const _chunk of await this.graph.stream(
        new Command({ resume: { approved: true } }),
        { ...graphConfig, streamMode: 'values' },
      )) {
        // consume stream
      }
      await this.emitFinalMessage(sessionId);
    } catch (err: unknown) {
      if (this.isInterruptError(err)) {
        const state = await this.graph.getState(graphConfig);
        const scoredCustomers =
          (state.values['scoredCustomers'] as Array<{ qualifies: boolean }> | undefined) ?? [];
        const qualifiedCount = scoredCustomers.filter((s) => s.qualifies).length;
        this.gateway.emitAwaitingApproval(sessionId, {
          sessionId,
          qualifiedCount,
          timestamp: Date.now(),
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.gateway.emitSessionError(sessionId, { sessionId, error: msg, timestamp: Date.now() });
    }
  }

  async getSessionCustomers(sessionId: string): Promise<Customer[]> {
    const state = await this.getSessionSnapshot(sessionId);
    return state.customers;
  }

  async getSessionSnapshot(sessionId: string): Promise<{
    customers: Customer[];
    scoredCustomers: ScoredCustomer[];
    transactionSummaries: TransactionSummary[];
    generatedMessages: GeneratedMessage[];
    spendingInsights: SpendingInsight[];
  }> {
    const graphConfig = { configurable: { thread_id: sessionId } };
    const state = await this.graph.getState(graphConfig);
    return {
      customers: (state.values['customers'] as Customer[] | undefined) ?? [],
      scoredCustomers: (state.values['scoredCustomers'] as ScoredCustomer[] | undefined) ?? [],
      transactionSummaries:
        (state.values['transactionSummaries'] as TransactionSummary[] | undefined) ?? [],
      generatedMessages:
        (state.values['generatedMessages'] as GeneratedMessage[] | undefined) ?? [],
      spendingInsights: (state.values['spendingInsights'] as SpendingInsight[] | undefined) ?? [],
    };
  }

  private async emitFinalMessage(sessionId: string): Promise<void> {
    const graphConfig = { configurable: { thread_id: sessionId } };
    const finalState = await this.graph.getState(graphConfig);
    const messages: unknown[] = (finalState.values['messages'] as unknown[]) ?? [];

    // Collect only the latest turn's tool messages (tool outputs immediately preceding the final AI message).
    // Using the full session history can attach stale result cards to new replies.
    interface ToolMsgContent {
      summary: string;
      resultType: string | null;
      resultData: unknown;
      durationMs: number;
    }
    const lastAiIndex = [...messages]
      .map((m, idx) => ({ idx, type: (m as { _getType?: () => string })._getType?.() }))
      .reverse()
      .find((x) => x.type === 'ai')?.idx;

    const toolMessages: unknown[] = [];
    if (lastAiIndex != null) {
      for (let i = lastAiIndex - 1; i >= 0; i--) {
        const msg = messages[i] as { _getType?: () => string };
        if (msg?._getType?.() !== 'tool') break;
        toolMessages.push(messages[i]);
      }
      toolMessages.reverse();
    }

    let resultType: string | null = null;
    let resultData: unknown = null;
    const toolCalls: Array<{
      toolName: string;
      input: Record<string, unknown>;
      resultSummary: string;
      durationMs: number;
    }> = [];

    for (const m of toolMessages) {
      try {
        const parsed = JSON.parse(String((m as { content: unknown }).content)) as ToolMsgContent;
        toolCalls.push({
          toolName: (m as { name?: string }).name ?? 'unknown',
          input: {},
          resultSummary: parsed.summary,
          durationMs: parsed.durationMs,
        });
        if (parsed.resultType && !resultType) {
          resultType = parsed.resultType;
          resultData = parsed.resultData;
        }
      } catch {
        /* skip malformed tool messages */
      }
    }

    // Get final AI message text for this turn
    const lastMsg = (
      lastAiIndex != null ? messages[lastAiIndex] : messages[messages.length - 1]
    ) as { _getType?: () => string; content: unknown } | undefined;
    const assistantContent = lastMsg?._getType?.() === 'ai' ? String(lastMsg.content) : '';

    const saved = await this.prisma.crmMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: assistantContent,
        toolCalls:
          toolCalls.length > 0
            ? (toolCalls as unknown as Parameters<
                typeof this.prisma.crmMessage.create
              >[0]['data']['toolCalls'])
            : undefined,
        resultType: resultType ?? undefined,
        resultData: resultData
          ? (resultData as Parameters<
              typeof this.prisma.crmMessage.create
            >[0]['data']['resultData'])
          : undefined,
      },
    });

    this.gateway.emitMessageComplete(sessionId, {
      sessionId,
      messageId: saved.id,
      content: assistantContent,
      toolCalls,
      resultType,
      resultData,
      timestamp: Date.now(),
    });
  }

  private isInterruptError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    return (
      err.message.includes('interrupt') ||
      err.constructor.name === 'GraphInterrupt' ||
      err.constructor.name === 'NodeInterrupt'
    );
  }
}
