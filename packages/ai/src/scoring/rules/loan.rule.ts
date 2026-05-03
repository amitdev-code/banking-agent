import type { LoanPenaltyConfig, TransactionSummary } from '@banking-crm/types';

export interface LoanPenaltyResult {
  penalty: number;
  hasExistingLoan: boolean;
  loanType: string | null;
}

export function loanPenalty(
  summary: TransactionSummary,
  config: LoanPenaltyConfig,
): LoanPenaltyResult {
  if (!summary.hasActiveLoan) {
    return { penalty: 0, hasExistingLoan: false, loanType: null };
  }

  const loanType = summary.loanType;
  let penalty = 0;

  if (loanType === 'personal') penalty = config.personal;
  else if (loanType === 'home') penalty = config.home;
  else penalty = config.other;

  penalty = Math.min(penalty, config.cap);

  return { penalty, hasExistingLoan: true, loanType };
}
