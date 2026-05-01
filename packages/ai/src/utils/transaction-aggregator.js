"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTransactionSummaries = buildTransactionSummaries;
function buildTransactionSummaries(grouped, monthlySalaries, recentTxCounts, customerCache) {
    const summaryMap = new Map();
    // Group by customerId
    const byCustomer = new Map();
    for (const row of grouped) {
        const existing = byCustomer.get(row.customerId) ?? [];
        existing.push(row);
        byCustomer.set(row.customerId, existing);
    }
    // Build monthly salary arrays (12 months, most recent first reversed to oldest-first)
    const salaryByCustomer = new Map();
    for (const row of monthlySalaries) {
        const arr = salaryByCustomer.get(row.customerId) ?? Array(12).fill(0);
        const monthIndex = getMonthIndex(row.month);
        if (monthIndex >= 0 && monthIndex < 12) {
            arr[monthIndex] = Number(row.total) || 0;
        }
        salaryByCustomer.set(row.customerId, arr);
    }
    // Build summaries for each customer
    for (const [customerId, rows] of byCustomer.entries()) {
        const categoryTotals = rows.map((r) => ({
            category: r.category,
            type: r.type,
            total: Number(r._sum.amount) || 0,
            count: r._count,
        }));
        const totalCredit = categoryTotals
            .filter((c) => c.type === 'CREDIT')
            .reduce((sum, c) => sum + c.total, 0);
        const totalDebit = categoryTotals
            .filter((c) => c.type === 'DEBIT')
            .reduce((sum, c) => sum + c.total, 0);
        const monthlySalaryCredits = salaryByCustomer.get(customerId) ?? Array(12).fill(0);
        const hasRegularIncome = monthlySalaryCredits.filter((v) => v > 0).length >= 3;
        const cache = customerCache.get(customerId);
        summaryMap.set(customerId, {
            customerId,
            categoryTotals,
            monthlySalaryCredits,
            totalCreditLast12Months: totalCredit,
            totalDebitLast12Months: totalDebit,
            transactionCountLast30Days: recentTxCounts.get(customerId) ?? 0,
            avgMonthlyBalance: cache?.avgMonthlyBalance ?? 0,
            hasRegularIncome,
            hasActiveLoan: cache?.hasActiveLoan ?? false,
            loanType: cache?.loanType ?? null,
        });
    }
    return summaryMap;
}
function getMonthIndex(month) {
    const now = new Date();
    const diffMs = now.getTime() - month.getTime();
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    return Math.min(11, Math.max(0, diffMonths));
}
