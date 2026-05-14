import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { AgentService } from '../ai/agent.service';

@Injectable()
export class CrmSessionService {
  private readonly logger = new Logger(CrmSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
  ) {}

  async createSession(tenantId: string, userId: string, title?: string) {
    const session = await this.prisma.crmSession.create({
      data: { tenantId, userId, title: title ?? null, threadId: '' },
    });
    // threadId = sessionId (LangGraph thread_id)
    const updated = await this.prisma.crmSession.update({
      where: { id: session.id },
      data: { threadId: session.id },
    });
    return { sessionId: updated.id, title: updated.title };
  }

  async listSessions(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      this.prisma.crmSession.findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.crmSession.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);
    return { sessions, total, page, limit };
  }

  async getSession(sessionId: string, tenantId: string) {
    const session = await this.prisma.crmSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async getSessionCustomers(sessionId: string, tenantId: string) {
    const session = await this.prisma.crmSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const snapshot = await this.agentService.getSessionSnapshot(sessionId);
    const scoredByCustomerId = new Map(
      snapshot.scoredCustomers.map((scored) => [scored.customerId, scored]),
    );
    const generatedMessageByCustomerId = new Map(
      snapshot.generatedMessages.map((message) => [message.customerId, message]),
    );
    const insightByCustomerId = new Map(
      snapshot.spendingInsights.map((insight) => [insight.customerId, insight]),
    );
    const txSummaryByCustomerId = new Map(
      snapshot.transactionSummaries.map((summary) => [summary.customerId, summary]),
    );

    const sidebarCustomers = snapshot.customers.map((c) => ({
      ...(txSummaryByCustomerId.get(c.id)
        ? {
            totalCreditLast12Months: txSummaryByCustomerId.get(c.id)!.totalCreditLast12Months,
            totalDebitLast12Months: txSummaryByCustomerId.get(c.id)!.totalDebitLast12Months,
            topSpendingCategories: txSummaryByCustomerId
              .get(c.id)!
              .categoryTotals.filter((item) => item.type === 'DEBIT')
              .sort((a, b) => b.total - a.total)
              .slice(0, 3)
              .map((item) => item.category),
          }
        : {}),
      id: c.id,
      fullName: c.fullName,
      city: c.city,
      age: c.age,
      segment: c.segment,
      accountType: c.accountType,
      avgMonthlyBalance: c.avgMonthlyBalance,
      hasActiveLoan: c.hasActiveLoan,
      allocatedProducts:
        scoredByCustomerId.get(c.id)?.recommendedProducts.map((product) => product.product) ?? [],
      productRationales:
        scoredByCustomerId.get(c.id)?.recommendedProducts.map((product) => ({
          product: product.product,
          rationale: product.rationale,
          confidence: product.confidence,
        })) ?? [],
      spendingInsight: insightByCustomerId.get(c.id)
        ? {
            summary: insightByCustomerId.get(c.id)!.summary,
            keyCategories: insightByCustomerId.get(c.id)!.keyCategories,
            riskFlags: insightByCustomerId.get(c.id)!.riskFlags,
            opportunities: insightByCustomerId.get(c.id)!.opportunities,
          }
        : null,
      generatedMessage: generatedMessageByCustomerId.get(c.id)
        ? {
            messageEn: generatedMessageByCustomerId.get(c.id)!.english,
            messageHi: generatedMessageByCustomerId.get(c.id)!.hindi,
          }
        : null,
      qualifies: scoredByCustomerId.get(c.id)?.qualifies ?? false,
    }));
    return {
      sessionId,
      totalCount: sidebarCustomers.length,
      customers: sidebarCustomers,
    };
  }

  async sendMessage(sessionId: string, tenantId: string, userId: string, content: string) {
    const session = await this.prisma.crmSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Session not found');

    // Save user message
    const userMsg = await this.prisma.crmMessage.create({
      data: { sessionId, role: 'USER', content },
    });

    // Auto-generate title from first message
    if (!session.title) {
      const shortTitle = content.slice(0, 60) + (content.length > 60 ? '...' : '');
      await this.prisma.crmSession.update({
        where: { id: sessionId },
        data: { title: shortTitle },
      });
    }

    // Update session updatedAt
    await this.prisma.crmSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Fire-and-forget agent processing
    void this.agentService
      .processMessage(sessionId, tenantId, userMsg.id, content)
      .catch((err: unknown) => {
        this.logger.error(`processMessage failed for session ${sessionId}: ${String(err)}`);
      });

    return { messageId: userMsg.id, sessionId };
  }

  async approveMessages(sessionId: string, tenantId: string) {
    const session = await this.prisma.crmSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Session not found');

    void this.agentService.approveMessages(sessionId).catch((err: unknown) => {
      this.logger.error(`approveMessages failed for session ${sessionId}: ${String(err)}`);
    });

    return { status: 'processing' };
  }

  async archiveSession(sessionId: string, tenantId: string) {
    const session = await this.prisma.crmSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.crmSession.update({ where: { id: sessionId }, data: { status: 'ARCHIVED' } });
    return { success: true };
  }
}
