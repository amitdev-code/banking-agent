import type { ScoreBracket, TransactionSummary } from '@banking-crm/types';

import { resolveFromBrackets } from '../brackets';

export function activityScore(summary: TransactionSummary, brackets: ScoreBracket[]): number {
  return resolveFromBrackets(summary.transactionCountLast30Days, brackets);
}
