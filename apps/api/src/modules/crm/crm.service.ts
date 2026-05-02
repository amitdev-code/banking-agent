import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { SessionUser } from '@banking-crm/types';

import { Prisma } from '@banking-crm/database';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
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

    // Fire and forget
    this.aiService
      .runWorkflow(run.id, user.tenantId, dto)
      .catch((err: unknown) =>
        this.logger.error(`Background workflow error for run ${run.id}`, err),
      );

    return { runId: run.id };
  }

  async getHistory(tenantId: string, page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.analysisRun.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          userId: true,
          mode: true,
          status: true,
          query: true,
          customerCount: true,
          highValueCount: true,
          avgScore: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.analysisRun.count({ where: { tenantId } }),
    ]);
    return { items, total, page, limit };
  }

  async getRunDetail(tenantId: string, runId: string) {
    const run = await this.prisma.analysisRun.findFirst({
      where: { id: runId, tenantId },
      include: { scoredResults: true },
    });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    return run;
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
