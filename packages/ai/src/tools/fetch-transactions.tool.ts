import type { PrismaClient } from '@banking-crm/database';

import { buildTransactionSummaries } from '../utils/transaction-aggregator';
import type { CrmSessionState } from '../graph/state';
import type { ToolResult, EmitTool } from './index';

export async function runFetchTransactions(
  _input: Record<string, never>,
  state: CrmSessionState,
  deps: { prisma: PrismaClient; emitTool: EmitTool },
): Promise<ToolResult> {
  const customerIds = state.customers.map((c) => c.id);

  if (customerIds.length === 0) {
    return {
      summary: 'No customers loaded. Fetch customers first.',
      stateUpdate: { transactionSummaries: [] },
    };
  }

  deps.emitTool(
    state.sessionId,
    'fetch_transactions',
    'start',
    `Loading transactions for ${customerIds.length} customers`,
  );

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const grouped = await deps.prisma.transaction.groupBy({
    by: ['customerId', 'category', 'type'],
    where: { customerId: { in: customerIds }, occurredAt: { gte: twelveMonthsAgo } },
    _sum: { amount: true },
    _count: true,
  });

  const monthlySalaries = await deps.prisma.$queryRaw<
    Array<{ customerId: string; month: Date; total: unknown }>
  >`
    SELECT "customerId", DATE_TRUNC('month', "occurredAt") AS month, SUM(amount) AS total
    FROM transactions
    WHERE "customerId" = ANY(${customerIds}::text[])
      AND category = 'SALARY' AND type = 'CREDIT' AND "occurredAt" >= ${twelveMonthsAgo}
    GROUP BY "customerId", DATE_TRUNC('month', "occurredAt")
    ORDER BY month ASC
  `;

  const recentCounts = await deps.prisma.transaction.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customerIds }, occurredAt: { gte: thirtyDaysAgo } },
    _count: true,
  });

  const recentTxCounts = new Map(recentCounts.map((r) => [r.customerId, r._count]));
  const customerCache = new Map(
    state.customers.map((c) => [
      c.id,
      {
        avgMonthlyBalance: c.avgMonthlyBalance,
        hasActiveLoan: c.hasActiveLoan,
        loanType: c.loanType,
      },
    ]),
  );

  const summaryMap = buildTransactionSummaries(
    grouped.map((r) => ({
      customerId: r.customerId,
      category: r.category,
      type: r.type,
      _sum: { amount: r._sum.amount },
      _count: r._count,
    })),
    monthlySalaries,
    recentTxCounts,
    customerCache,
  );

  const transactionSummaries = state.customers.map(
    (c) =>
      summaryMap.get(c.id) ?? {
        customerId: c.id,
        categoryTotals: [],
        monthlySalaryCredits: Array<number>(12).fill(0),
        totalCreditLast12Months: 0,
        totalDebitLast12Months: 0,
        transactionCountLast30Days: 0,
        avgMonthlyBalance: c.avgMonthlyBalance,
        hasRegularIncome: false,
        hasActiveLoan: c.hasActiveLoan,
        loanType: c.loanType,
      },
  );

  return {
    summary: `Loaded transaction summaries for ${transactionSummaries.length} customers`,
    stateUpdate: { transactionSummaries },
  };
}
