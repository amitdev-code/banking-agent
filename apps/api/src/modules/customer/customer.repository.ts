import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: CustomerQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      tenantId,
      ...(query.city ? { city: query.city } : {}),
      ...(query.segment ? { segment: query.segment } : {}),
    };

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(tenantId: string, id: string) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [customer, categoryTotals] = await this.prisma.$transaction([
      this.prisma.customer.findFirst({
        where: { id, tenantId },
        include: {
          scoredResults: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.transaction.groupBy({
        by: ['category', 'type'],
        where: { customerId: id, tenantId, occurredAt: { gte: twelveMonthsAgo } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    if (!customer) return null;

    const raw = customer.scoredResults[0];
    const latestScore = raw
      ? {
          ...raw,
          totalScore: Number(raw.totalScore),
          conversionProbability: Number(raw.conversionProbability),
          loanPenalty: Number(raw.loanPenalty),
          recommendedProducts: raw.recommendations,
        }
      : undefined;

    return {
      ...customer,
      avgMonthlyBalance: Number(customer.avgMonthlyBalance),
      scoredResults: undefined,
      latestScore,
      spendingCategories: categoryTotals.map((ct) => ({
        category: ct.category,
        type: ct.type,
        total: Number(ct._sum?.amount ?? 0),
        count: ct._count,
      })),
    };
  }

  private buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Record<string, string> {
    const fieldMap: Record<string, string> = {
      age: 'age',
      balance: 'avgMonthlyBalance',
      createdAt: 'createdAt',
    };
    const field = (sortBy && fieldMap[sortBy]) ?? 'createdAt';
    return { [field]: sortOrder };
  }
}
