import type { PrismaClient } from '@banking-crm/database';
import type { TransactionSummary } from '@banking-crm/types';

import { buildTransactionSummaries } from '../utils/transaction-aggregator';
import type { CrmState } from '../graph/state';

interface FetchTransactionsDeps {
  prisma: PrismaClient;
  emitStep: (runId: string, step: string, status: string, detail?: string, progress?: { current: number; total: number }) => void;
}

export function createFetchTransactionsNode(deps: FetchTransactionsDeps) {
  return async function fetchTransactionsNode(
    state: CrmState,
  ): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'fetchTransactions', 'running', `Querying transactions for ${state.customers.length} customers`);

    const customerIds = state.customers.map((c) => c.id);
    if (customerIds.length === 0) {
      deps.emitStep(state.runId, 'fetchTransactions', 'done');
      return { transactionSummaries: [] };
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Single groupBy query — no N+1
    const grouped = await deps.prisma.transaction.groupBy({
      by: ['customerId', 'category', 'type'],
      where: {
        customerId: { in: customerIds },
        occurredAt: { gte: twelveMonthsAgo },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Monthly salary credits via raw SQL
    const monthlySalaries = await deps.prisma.$queryRaw<
      Array<{ customerId: string; month: Date; total: unknown }>
    >`
      SELECT
        "customerId",
        DATE_TRUNC('month', "occurredAt") AS month,
        SUM(amount) AS total
      FROM transactions
      WHERE "customerId" = ANY(${customerIds}::text[])
        AND category = 'SALARY'
        AND type = 'CREDIT'
        AND "occurredAt" >= ${twelveMonthsAgo}
      GROUP BY "customerId", DATE_TRUNC('month', "occurredAt")
      ORDER BY month ASC
    `;

    // Recent activity count
    const recentCounts = await deps.prisma.transaction.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds },
        occurredAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    });
    const recentTxCounts = new Map(recentCounts.map((r) => [r.customerId, r._count]));

    // Customer cache for balance + loan info
    const customerCache = new Map(
      state.customers.map((c) => [
        c.id,
        { avgMonthlyBalance: c.avgMonthlyBalance, hasActiveLoan: c.hasActiveLoan, loanType: c.loanType },
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

    // Ensure every customer has a summary (even if no transactions)
    const total = state.customers.length;
    const transactionSummaries: TransactionSummary[] = [];
    const BATCH = 100;

    for (let i = 0; i < state.customers.length; i++) {
      const c = state.customers[i]!;
      transactionSummaries.push(
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
      if ((i + 1) % BATCH === 0 && i + 1 < total) {
        deps.emitStep(state.runId, 'fetchTransactions', 'running', `Building summary ${i + 1} of ${total}`, { current: i + 1, total });
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    deps.emitStep(state.runId, 'fetchTransactions', 'done', `${transactionSummaries.length} transaction summaries built`, { current: transactionSummaries.length, total: transactionSummaries.length });
    return { transactionSummaries };
  };
}
