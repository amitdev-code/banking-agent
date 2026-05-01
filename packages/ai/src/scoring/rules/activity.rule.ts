import type { TransactionSummary } from '@banking-crm/types';

export const ACTIVITY_MAX = 5;

export function activityScore(summary: TransactionSummary): number {
  const count = summary.transactionCountLast30Days;

  if (count > 7) return 5;
  if (count >= 4) return 3;
  if (count >= 1) return 1;
  return 0;
}
