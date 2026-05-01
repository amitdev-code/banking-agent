import type { TransactionSummary } from '@banking-crm/types';

export const LOAN_PENALTY_CAP = 10;

export interface LoanPenaltyResult {
  penalty: number;
  hasExistingLoan: boolean;
  loanType: string | null;
}

export function loanPenalty(summary: TransactionSummary): LoanPenaltyResult {
  if (!summary.hasActiveLoan) {
    return { penalty: 0, hasExistingLoan: false, loanType: null };
  }

  const loanType = summary.loanType;
  let penalty = 0;

  if (loanType === 'personal') penalty = 8;
  else if (loanType === 'home') penalty = 3;
  else penalty = 5;

  // Cap combined penalty
  penalty = Math.min(penalty, LOAN_PENALTY_CAP);

  return { penalty, hasExistingLoan: true, loanType };
}
