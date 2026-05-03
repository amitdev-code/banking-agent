import type { TransactionSummary } from '@banking-crm/types';

const DIVERSE_CATEGORIES = [
  'GROCERY', 'FUEL', 'ENTERTAINMENT', 'DINING', 'SHOPPING',
  'UTILITIES', 'MEDICAL', 'TRAVEL', 'INSURANCE', 'INVESTMENT',
];

export function spendingScore(summary: TransactionSummary, maxScore: number): number {
  let score = 0;
  const half = maxScore / 2;

  const presentCategories = new Set(
    summary.categoryTotals
      .filter((c) => c.type === 'DEBIT' && DIVERSE_CATEGORIES.includes(c.category))
      .map((c) => c.category),
  );

  if (presentCategories.size >= 6) score += half;
  else if (presentCategories.size >= 4) score += half * 0.7;
  else if (presentCategories.size >= 2) score += half * 0.4;
  else score += half * 0.1;

  const totalIncome = summary.totalCreditLast12Months;
  const emiTotal = summary.categoryTotals
    .filter((c) => c.category === 'EMI' && c.type === 'DEBIT')
    .reduce((sum, c) => sum + c.total, 0);
  const nonEmiDebit = summary.totalDebitLast12Months - emiTotal;

  if (totalIncome > 0) {
    const ratio = nonEmiDebit / totalIncome;
    if (ratio <= 0.4) score += half;
    else if (ratio <= 0.6) score += half * 0.7;
    else if (ratio <= 0.8) score += half * 0.4;
    else score += half * 0.1;
  }

  return Math.min(Math.round(score), maxScore);
}
