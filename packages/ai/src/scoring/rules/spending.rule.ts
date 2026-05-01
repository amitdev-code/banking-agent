import type { TransactionSummary } from '@banking-crm/types';

export const SPENDING_MAX = 20;

const DIVERSE_CATEGORIES = [
  'GROCERY', 'FUEL', 'ENTERTAINMENT', 'DINING', 'SHOPPING',
  'UTILITIES', 'MEDICAL', 'TRAVEL', 'INSURANCE', 'INVESTMENT',
];

export function spendingScore(summary: TransactionSummary): number {
  let score = 0;

  // Diversity: how many non-EMI/ATM categories are present
  const presentCategories = new Set(
    summary.categoryTotals
      .filter((c) => c.type === 'DEBIT' && DIVERSE_CATEGORIES.includes(c.category))
      .map((c) => c.category),
  );

  if (presentCategories.size >= 6) score += 10;
  else if (presentCategories.size >= 4) score += 7;
  else if (presentCategories.size >= 2) score += 4;
  else score += 1;

  // Spending-to-income ratio: healthy spending shows capacity without over-leverage
  const totalIncome = summary.totalCreditLast12Months;
  const emiTotal = summary.categoryTotals
    .filter((c) => c.category === 'EMI' && c.type === 'DEBIT')
    .reduce((sum, c) => sum + c.total, 0);
  const nonEmiDebit = summary.totalDebitLast12Months - emiTotal;

  if (totalIncome > 0) {
    const ratio = nonEmiDebit / totalIncome;
    if (ratio <= 0.4) score += 10;
    else if (ratio <= 0.6) score += 7;
    else if (ratio <= 0.8) score += 4;
    else score += 1;
  }

  return Math.min(score, SPENDING_MAX);
}
