import type { TransactionSummary } from '@banking-crm/types';

export function productsScore(summary: TransactionSummary, maxScore: number): number {
  let score = 0;

  const lifestyleSpend = summary.categoryTotals
    .filter((c) => ['SHOPPING', 'DINING', 'ENTERTAINMENT'].includes(c.category) && c.type === 'DEBIT')
    .reduce((sum, c) => sum + c.total, 0);

  const totalDebit = summary.totalDebitLast12Months;

  const hasNoCreditCardUsage = totalDebit > 0 && lifestyleSpend / totalDebit < 0.15;
  if (hasNoCreditCardUsage) score += Math.round(maxScore * 0.4);

  if (!summary.hasActiveLoan || summary.loanType === 'personal') score += Math.round(maxScore * 0.3);

  if (!summary.hasActiveLoan) score += Math.round(maxScore * 0.3);
  else if (summary.loanType !== 'personal') score += Math.round(maxScore * 0.1);

  return Math.min(score, maxScore);
}
