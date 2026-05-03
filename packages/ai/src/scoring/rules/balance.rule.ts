import type { ScoreBracket, TransactionSummary } from '@banking-crm/types';

import { resolveFromBrackets } from '../brackets';

export function balanceScore(summary: TransactionSummary, brackets: ScoreBracket[]): number {
  return resolveFromBrackets(summary.avgMonthlyBalance, brackets);
}
