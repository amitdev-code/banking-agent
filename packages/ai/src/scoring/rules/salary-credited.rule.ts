import type { MonthBracket, TransactionSummary } from '@banking-crm/types';

import { resolveFromMonthBrackets } from '../brackets';

export function salaryCreditedScore(summary: TransactionSummary, brackets: MonthBracket[]): number {
  const monthsWithSalary = summary.monthlySalaryCredits.filter((v) => v > 0).length;
  return resolveFromMonthBrackets(monthsWithSalary, brackets);
}
