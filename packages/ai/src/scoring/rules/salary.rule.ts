import type { ScoreBracket, TransactionSummary } from '@banking-crm/types';

import { resolveFromBrackets } from '../brackets';

export function salaryScore(summary: TransactionSummary, brackets: ScoreBracket[]): number {
  const credits = summary.monthlySalaryCredits;
  const presentMonths = credits.filter((v) => v > 0);
  if (presentMonths.length === 0) return 0;

  const avg = presentMonths.reduce((a, b) => a + b, 0) / presentMonths.length;
  return resolveFromBrackets(avg, brackets);
}
