import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { SessionUser } from '@banking-crm/types';

import { Prisma } from '@banking-crm/database';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import type { ConfirmCustomersDto } from './dto/confirm-customers.dto';
import type { RunCrmDto } from './dto/run-crm.dto';
import type { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async run(user: SessionUser, dto: RunCrmDto): Promise<{ runId: string }> {
    const run = await this.prisma.analysisRun.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        mode: dto.mode,
        status: 'RUNNING',
        query: dto.naturalLanguageQuery ?? null,
        filters: dto.filters != null ? (dto.filters as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    // Fire and forget — runs planner + fetchCustomers, then pauses at AWAITING_SELECTION
    this.aiService
      .startFetch(run.id, user.tenantId, dto)
      .catch((err: unknown) => this.logger.error(`Stage 1 error for run ${run.id}`, err));

    return { runId: run.id };
  }

  async confirmCustomers(tenantId: string, runId: string, dto: ConfirmCustomersDto): Promise<void> {
    const run = await this.prisma.analysisRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    if ((run.status as string) !== 'AWAITING_SELECTION') {
      throw new BadRequestException(
        `Run is not awaiting customer selection (status: ${run.status})`,
      );
    }

    await this.prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'RUNNING' },
    });

    // Fire and forget — filters customers, runs analysis, pauses at AWAITING_APPROVAL
    this.aiService
      .continueWithAnalysis(runId, tenantId, dto.selectedCustomerIds)
      .catch((err: unknown) => this.logger.error(`Stage 2 error for run ${runId}`, err));
  }

  async confirmMessages(tenantId: string, runId: string): Promise<void> {
    const run = await this.prisma.analysisRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    if ((run.status as string) !== 'AWAITING_APPROVAL') {
      throw new BadRequestException(`Run is not awaiting message approval (status: ${run.status})`);
    }

    await this.prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'RUNNING' },
    });

    // Fire and forget — runs message generation, completes the workflow
    this.aiService
      .continueWithMessages(runId)
      .catch((err: unknown) => this.logger.error(`Stage 3 error for run ${runId}`, err));
  }

  async getRunCustomers(tenantId: string, runId: string) {
    const run = await this.prisma.analysisRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);

    const state = await this.aiService.getRunState(runId);
    return {
      runId,
      status: run.status,
      customers: state.customers ?? [],
      plannerNote: state.plannerNote,
    };
  }

  async getHistory(tenantId: string, page: number, limit: number) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.analysisRun.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          mode: true,
          status: true,
          customerCount: true,
          highValueCount: true,
          avgScore: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      this.prisma.analysisRun.count({ where: { tenantId } }),
    ]);

    const items = rows.map((r) => ({
      ...r,
      avgScore: r.avgScore != null ? Number(r.avgScore) : null,
      createdAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    }));

    return { items, total, page, limit };
  }

  async getRunDetail(tenantId: string, runId: string) {
    const run = await this.prisma.analysisRun.findFirst({
      where: { id: runId, tenantId },
      include: {
        scoredResults: {
          include: { customer: true },
          orderBy: { totalScore: 'desc' },
        },
      },
    });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);

    const scoredResults = run.scoredResults.map((r) => ({
      ...r,
      totalScore: Number(r.totalScore),
      conversionProbability: Number(r.conversionProbability),
      loanPenalty: Number(r.loanPenalty),
      fullName: r.customer.fullName,
      phone: r.customer.phone,
      city: r.customer.city,
      age: r.customer.age,
      avgMonthlyBalance: Number(r.customer.avgMonthlyBalance),
      resultId: r.id,
      recommendedProducts: r.recommendations,
      customer: undefined,
    }));

    return {
      ...run,
      avgScore: run.avgScore != null ? Number(run.avgScore) : null,
      scoredResults,
    };
  }

  async pauseRun(tenantId: string, runId: string): Promise<void> {
    const run = await this.prisma.analysisRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    if (run.status !== 'RUNNING') throw new BadRequestException('Run is not in RUNNING state');
    await this.aiService.pauseWorkflow(runId);
  }

  async resumeRun(tenantId: string, runId: string, user: SessionUser): Promise<void> {
    const run = await this.prisma.analysisRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    if (run.status !== 'PAUSED') throw new BadRequestException('Run is not in PAUSED state');
    const dto: RunCrmDto = { mode: run.mode as 'agent' | 'custom' };
    await this.aiService.resumeWorkflow(runId, tenantId, dto);
  }

  async updateMessage(
    tenantId: string,
    resultId: string,
    dto: UpdateMessageDto,
  ): Promise<{ id: string }> {
    const result = await this.prisma.scoredResult.findFirst({
      where: { id: resultId, tenantId },
    });
    if (!result) throw new NotFoundException(`Result ${resultId} not found`);

    const updated = await this.prisma.scoredResult.update({
      where: { id: resultId },
      data: { editedMessage: dto.editedMessage, isMessageEdited: true },
    });
    return { id: updated.id };
  }
}
