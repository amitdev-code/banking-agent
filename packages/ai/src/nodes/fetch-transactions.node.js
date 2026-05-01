"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFetchTransactionsNode = createFetchTransactionsNode;
const transaction_aggregator_1 = require("../utils/transaction-aggregator");
function createFetchTransactionsNode(deps) {
    return async function fetchTransactionsNode(state) {
        deps.emitStep(state.runId, 'fetchTransactions', 'running');
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
        const monthlySalaries = await deps.prisma.$queryRaw `
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
        const customerCache = new Map(state.customers.map((c) => [
            c.id,
            { avgMonthlyBalance: c.avgMonthlyBalance, hasActiveLoan: c.hasActiveLoan, loanType: c.loanType },
        ]));
        const summaryMap = (0, transaction_aggregator_1.buildTransactionSummaries)(grouped.map((r) => ({
            customerId: r.customerId,
            category: r.category,
            type: r.type,
            _sum: { amount: r._sum.amount },
            _count: r._count,
        })), monthlySalaries, recentTxCounts, customerCache);
        // Ensure every customer has a summary (even if no transactions)
        const transactionSummaries = state.customers.map((c) => {
            return (summaryMap.get(c.id) ?? {
                customerId: c.id,
                categoryTotals: [],
                monthlySalaryCredits: Array(12).fill(0),
                totalCreditLast12Months: 0,
                totalDebitLast12Months: 0,
                transactionCountLast30Days: 0,
                avgMonthlyBalance: c.avgMonthlyBalance,
                hasRegularIncome: false,
                hasActiveLoan: c.hasActiveLoan,
                loanType: c.loanType,
            });
        });
        deps.emitStep(state.runId, 'fetchTransactions', 'done');
        return { transactionSummaries };
    };
}
