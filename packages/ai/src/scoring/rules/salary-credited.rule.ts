import type { TransactionSummary } from '@banking-crm/types';

export const SALARY_CREDITED_MAX = 15;

export function salaryCreditedScore(summary: TransactionSummary): number {
  const monthsWithSalary = summary.monthlySalaryCredits.filter((v) => v > 0).length;

  if (monthsWithSalary >= 12) return 15;
  if (monthsWithSalary >= 10) return 12;
  if (monthsWithSalary >= 8) return 9;
  if (monthsWithSalary >= 6) return 6;
  if (monthsWithSalary >= 3) return 3;
  return 0;
}
