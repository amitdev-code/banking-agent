import { loanPenalty } from '../rules/loan.rule';
import type { TransactionSummary } from '@banking-crm/types';

function makeSummary(hasPersonalLoan: boolean, hasHomeLoan: boolean): TransactionSummary {
  return {
    avgMonthlySalary: 50000,
    avgMonthlyBalance: 100000,
    totalDebitLast12m: 300000,
    categoryBreakdown: {},
    monthsWithSalaryCredit: 12,
    hasPersonalLoan,
    hasHomeLoan,
    transactionCountLast30d: 10,
  };
}

describe('loanPenalty', () => {
  it('returns 0 penalty when no loans', () => {
    expect(loanPenalty(makeSummary(false, false)).penalty).toBe(0);
  });

  it('returns 8 penalty for personal loan only', () => {
    expect(loanPenalty(makeSummary(true, false)).penalty).toBe(8);
  });

  it('returns 3 penalty for home loan only', () => {
    expect(loanPenalty(makeSummary(false, true)).penalty).toBe(3);
  });

  it('caps combined penalty at 10', () => {
    // personal(8) + home(3) = 11 → capped at 10
    expect(loanPenalty(makeSummary(true, true)).penalty).toBe(10);
  });

  it('penalty is never negative', () => {
    expect(loanPenalty(makeSummary(false, false)).penalty).toBeGreaterThanOrEqual(0);
  });
});
