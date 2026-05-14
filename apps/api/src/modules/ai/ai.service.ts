import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildCrmGraph, createCheckpointer } from '@banking-crm/ai';
import type { CompiledCrmGraph, CrmState } from '@banking-crm/ai';
import { defaultScoringConfig, type WorkflowStepName } from '@banking-crm/types';

import { PrismaService } from '../../database/prisma.service';
import { CrmGateway } from '../crm/crm.gateway';
import type { RunCrmDto } from '../crm/dto/run-crm.dto';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private graph!: CompiledCrmGraph;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CrmGateway,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const dbUrl = this.config.getOrThrow<string>('DATABASE_URL');
    const openaiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
    const checkpointer = await createCheckpointer(dbUrl);

    this.graph = buildCrmGraph({
      prisma: this.prisma as Parameters<typeof buildCrmGraph>[0]['prisma'],
      openaiApiKey: openaiKey,
      checkpointer,
      emitStep: (runId, step, status, detail, progress) => {
        const progressStr = progress ? ` [${progress.current}/${progress.total}]` : '';
        const detailStr = detail ? ` — ${detail}` : '';
        this.logger.log(`[run:${runId}] ${step}:${status}${detailStr}${progressStr}`);
        this.gateway.emitStepUpdate(runId, {
          runId,
          step: step as WorkflowStepName,
          status: status as 'running' | 'done' | 'error',
          detail,
          progress,
          timestamp: Date.now(),
        });
      },
      isPaused: async (runId) => {
        const run = await this.prisma.analysisRun.findUnique({
          where: { id: runId },
          select: { status: true },
        });
        return run?.status === 'PAUSED';
      },
    });

    this.logger.log('CRM AI graph initialized');
  }

  // ─── Stage 1: planner → fetchCustomers ────────────────────────────────────

  async startFetch(runId: string, tenantId: string, dto: RunCrmDto): Promise<void> {
    this.logger.log(`[run:${runId}] Stage 1: startFetch, mode=${dto.mode}`);
    const config = { configurable: { thread_id: runId } };

    const scoringConfigRow = await this.prisma.scoringConfig.findUnique({ where: { tenantId } });
    const scoringConfig = scoringConfigRow
      ? (scoringConfigRow.rules as unknown as typeof defaultScoringConfig)
      : defaultScoringConfig;

    try {
      const stream = await this.graph.stream(
        {
          runId,
          tenantId,
          mode: dto.mode,
          naturalLanguageQuery: dto.naturalLanguageQuery,
          resolvedFilters: dto.filters ?? {},
          isPaused: false,
          scoringConfig,
        },
        config,
      );
      for await (const _chunk of stream) {
      }

      const state = await this.graph.getState(config);
      const customers = (state.values as CrmState).customers ?? [];

      await this.prisma.analysisRun.update({
        where: { id: runId },
        data: { status: 'AWAITING_SELECTION' as never, customerCount: customers.length },
      });

      this.gateway.emitAwaitingSelection(runId, { runId, customerCount: customers.length });
      this.logger.log(
        `[run:${runId}] Stage 1 done — ${customers.length} customers fetched, awaiting selection`,
      );
    } catch (error) {
      await this.handleError(runId, error);
    }
  }

  // ─── Stage 2: fetchTransactions → … → recommendation ─────────────────────

  async continueWithAnalysis(
    runId: string,
    tenantId: string,
    selectedCustomerIds: string[],
  ): Promise<void> {
    this.logger.log(
      `[run:${runId}] Stage 2: continueWithAnalysis, selected=${selectedCustomerIds.length}`,
    );
    const config = { configurable: { thread_id: runId } };

    try {
      // Filter the customers list in graph state to only selected IDs
      const currentState = await this.graph.getState(config);
      const allCustomers = (currentState.values as CrmState).customers ?? [];
      const filteredCustomers = allCustomers.filter((c) => selectedCustomerIds.includes(c.id));

      await this.graph.updateState(config, { customers: filteredCustomers });

      const stream = await this.graph.stream(null, config);
      for await (const _chunk of stream) {
      }

      const finalState = await this.graph.getState(config);
      const state = finalState.values as CrmState;
      const scoredCustomers = state.scoredCustomers ?? [];
      const qualified = scoredCustomers.filter((s) => s.qualifies);
      const avgScore =
        qualified.length > 0
          ? qualified.reduce((sum, s) => sum + s.totalScore, 0) / qualified.length
          : 0;

      // Persist scored results (messages are null at this stage)
      await this.persistScoredResults(runId, tenantId, state);

      await this.prisma.analysisRun.update({
        where: { id: runId },
        data: {
          status: 'AWAITING_APPROVAL' as never,
          highValueCount: qualified.length,
          avgScore,
        },
      });

      this.gateway.emitAwaitingApproval(runId, {
        runId,
        scoredCount: scoredCustomers.length,
        qualifiedCount: qualified.length,
        avgScore,
      });
      this.logger.log(
        `[run:${runId}] Stage 2 done — ${scoredCustomers.length} scored, ${qualified.length} qualified, awaiting approval`,
      );
    } catch (error) {
      await this.handleError(runId, error);
    }
  }

  // ─── Stage 3: message → END ────────────────────────────────────────────────

  async continueWithMessages(runId: string): Promise<void> {
    this.logger.log(`[run:${runId}] Stage 3: continueWithMessages`);
    const config = { configurable: { thread_id: runId } };

    try {
      const stream = await this.graph.stream(null, config);
      for await (const _chunk of stream) {
      }

      const finalState = await this.graph.getState(config);
      const state = finalState.values as CrmState;
      const scoredCustomers = state.scoredCustomers ?? [];
      const qualified = scoredCustomers.filter((s) => s.qualifies);
      const avgScore =
        qualified.length > 0
          ? qualified.reduce((sum, s) => sum + s.totalScore, 0) / qualified.length
          : 0;

      // Update existing ScoredResult rows with generated messages
      await this.persistMessages(runId, state);

      await this.prisma.analysisRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          customerCount: scoredCustomers.length,
          highValueCount: qualified.length,
          avgScore,
          agentOutput: state as unknown as Parameters<
            typeof this.prisma.analysisRun.update
          >[0]['data']['agentOutput'],
        },
      });

      this.gateway.emitRunComplete(runId, {
        runId,
        customerCount: scoredCustomers.length,
        highValueCount: qualified.length,
        avgScore,
      });
      this.logger.log(`[run:${runId}] Stage 3 done — workflow complete`);
    } catch (error) {
      await this.handleError(runId, error);
    }
  }

  // ─── Graph state reader (for customer selection UI) ───────────────────────

  async getRunState(runId: string): Promise<CrmState> {
    const config = { configurable: { thread_id: runId } };
    const snap = await this.graph.getState(config);
    return snap.values as CrmState;
  }

  // ─── Pause / Resume ───────────────────────────────────────────────────────

  async pauseWorkflow(runId: string): Promise<void> {
    await this.prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'PAUSED' },
    });
  }

  async resumeWorkflow(runId: string, tenantId: string, dto: RunCrmDto): Promise<void> {
    await this.prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'RUNNING' },
    });
    void this.startFetch(runId, tenantId, dto);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async persistScoredResults(
    runId: string,
    tenantId: string,
    state: CrmState,
  ): Promise<void> {
    const scoredCustomers = Array.isArray(state.scoredCustomers) ? state.scoredCustomers : [];
    if (scoredCustomers.length === 0) return;

    const records = scoredCustomers.map((s) => ({
      runId,
      customerId: s.customerId,
      tenantId,
      totalScore: s.totalScore,
      readinessLabel: s.readinessLabel,
      conversionProbability: s.conversionProbability,
      qualifies: s.qualifies,
      breakdown: s.breakdown as object,
      recommendations: s.recommendedProducts as object,
      messageEn: null,
      messageHi: null,
      hasExistingLoan: s.hasExistingLoan,
      loanPenalty: s.loanPenalty,
      disqualifiedReason: s.disqualifiedReason ?? null,
      scoreExplanation: s.scoreExplanation ?? null,
      persona: s.persona ?? null,
      llmAdjustment: s.llmAdjustment ?? null,
      llmAdjustReason: s.llmAdjustReason ?? null,
    }));

    await this.prisma.scoredResult.createMany({ data: records, skipDuplicates: true });
  }

  private async persistMessages(runId: string, state: CrmState): Promise<void> {
    const messages = Array.isArray(state.generatedMessages) ? state.generatedMessages : [];
    if (messages.length === 0) return;

    await Promise.all(
      messages.map((m: { customerId: string; english?: string; hindi?: string }) =>
        this.prisma.scoredResult.updateMany({
          where: { runId, customerId: m.customerId },
          data: {
            messageEn: m.english ?? null,
            messageHi: m.hindi ?? null,
          },
        }),
      ),
    );
  }

  private async handleError(runId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Workflow ${runId} failed: ${message}`);
    await this.prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
    });
    this.gateway.emitRunError(runId, { runId, error: message });
  }
}
