import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildCrmGraph, createCheckpointer } from '@banking-crm/ai';
import type { CompiledCrmGraph } from '@banking-crm/ai';
import type { WorkflowStepName } from '@banking-crm/types';

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
      emitStep: (runId, step, status, detail) => {
        this.gateway.emitStepUpdate(runId, {
          runId,
          step: step as WorkflowStepName,
          status: status as 'running' | 'done' | 'error',
          detail,
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

  async runWorkflow(runId: string, tenantId: string, dto: RunCrmDto): Promise<void> {
    const config = { configurable: { thread_id: runId } };

    try {
      const stream = await this.graph.stream(
        {
          runId,
          tenantId,
          mode: dto.mode,
          naturalLanguageQuery: dto.naturalLanguageQuery,
          resolvedFilters: dto.filters ?? {},
          isPaused: false,
        },
        config,
      );

      for await (const _chunk of stream) {
        // Step events emitted via gateway inside each node
      }

      const finalState = await this.graph.getState(config);
      const state = finalState.values;

      const scoredCustomers = state.scoredCustomers ?? [];
      const qualified = scoredCustomers.filter((s: { qualifies: boolean }) => s.qualifies);
      const avgScore =
        qualified.length > 0
          ? qualified.reduce((sum: number, s: { totalScore: number }) => sum + s.totalScore, 0) / qualified.length
          : 0;

      // Persist scored results and messages
      await this.persistResults(runId, tenantId, state);

      await this.prisma.analysisRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          customerCount: scoredCustomers.length,
          highValueCount: qualified.length,
          avgScore,
          agentOutput: state as unknown as Parameters<typeof this.prisma.analysisRun.update>[0]['data']['agentOutput'],
        },
      });

      this.gateway.emitRunComplete(runId, {
        runId,
        customerCount: scoredCustomers.length,
        highValueCount: qualified.length,
        avgScore,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Workflow ${runId} failed: ${message}`);

      await this.prisma.analysisRun.update({
        where: { id: runId },
        data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
      });

      this.gateway.emitRunError(runId, { runId, error: message });
    }
  }

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
    void this.runWorkflow(runId, tenantId, dto);
  }

  private async persistResults(
    runId: string,
    tenantId: string,
    state: Record<string, unknown>,
  ): Promise<void> {
    const scoredCustomers = Array.isArray(state['scoredCustomers']) ? state['scoredCustomers'] : [];
    const messages = Array.isArray(state['generatedMessages']) ? state['generatedMessages'] : [];
    const messageMap = new Map(
      messages.map((m: { customerId: string }) => [m.customerId, m]),
    );

    const records = scoredCustomers.map((s: {
      customerId: string;
      totalScore: number;
      readinessLabel: string;
      conversionProbability: number;
      qualifies: boolean;
      breakdown: object;
      recommendedProducts: object;
      hasExistingLoan: boolean;
      loanPenalty: number;
      disqualifiedReason?: string;
    }) => {
      const msg = messageMap.get(s.customerId) as { english?: string; hindi?: string } | undefined;
      return {
        runId,
        customerId: s.customerId,
        tenantId,
        totalScore: s.totalScore,
        readinessLabel: s.readinessLabel,
        conversionProbability: s.conversionProbability,
        qualifies: s.qualifies,
        breakdown: s.breakdown,
        recommendations: s.recommendedProducts,
        messageEn: msg?.english ?? null,
        messageHi: msg?.hindi ?? null,
        hasExistingLoan: s.hasExistingLoan,
        loanPenalty: s.loanPenalty,
        disqualifiedReason: s.disqualifiedReason ?? null,
      };
    });

    if (records.length > 0) {
      await this.prisma.scoredResult.createMany({ data: records, skipDuplicates: true });
    }
  }
}
