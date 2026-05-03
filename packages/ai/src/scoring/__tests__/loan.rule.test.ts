import { loanPenalty } from '../rules/loan.rule';
import { defaultScoringConfig } from '@banking-crm/types';
import type { TransactionSummary } from '@banking-crm/types';

function makeSummary(hasActiveLoan: boolean, loanType: string | null): TransactionSummary {
  return {
    customerId: 'cust-001',
    monthlySalaryCredits: Array(12).fill(50000),
    avgMonthlyBalance: 100000,
    totalCreditLast12Months: 600000,
    totalDebitLast12Months: 300000,
    categoryTotals: [],
    transactionCountLast30Days: 10,
    hasRegularIncome: true,
    hasActiveLoan,
    loanType,
  };
}

const config = defaultScoringConfig.loanPenalty;

describe('loanPenalty', () => {
  it('returns 0 penalty when no loans', () => {
    expect(loanPenalty(makeSummary(false, null), config).penalty).toBe(0);
  });

  it('returns 8 penalty for personal loan', () => {
    expect(loanPenalty(makeSummary(true, 'personal'), config).penalty).toBe(8);
  });

  it('returns 3 penalty for home loan', () => {
    expect(loanPenalty(makeSummary(true, 'home'), config).penalty).toBe(3);
  });

  it('returns other penalty for unknown loan type', () => {
    expect(loanPenalty(makeSummary(true, 'vehicle'), config).penalty).toBe(config.other);
  });

  it('penalty never exceeds cap', () => {
    const result = loanPenalty(makeSummary(true, 'personal'), { ...config, personal: 999 });
    expect(result.penalty).toBeLessThanOrEqual(config.cap);
  });

  it('penalty is never negative', () => {
    expect(loanPenalty(makeSummary(false, null), config).penalty).toBeGreaterThanOrEqual(0);
  });
});
