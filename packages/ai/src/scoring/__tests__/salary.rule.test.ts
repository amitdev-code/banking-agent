import { salaryScore } from '../rules/salary.rule';
import { defaultScoringConfig } from '@banking-crm/types';
import type { TransactionSummary } from '@banking-crm/types';

function makeSummary(avgMonthlySalary: number): TransactionSummary {
  return {
    customerId: 'cust-001',
    monthlySalaryCredits: Array(12).fill(avgMonthlySalary),
    avgMonthlyBalance: 0,
    totalCreditLast12Months: avgMonthlySalary * 12,
    totalDebitLast12Months: 0,
    categoryTotals: [],
    transactionCountLast30Days: 5,
    hasRegularIncome: avgMonthlySalary > 0,
    hasActiveLoan: false,
    loanType: null,
  };
}

const brackets = defaultScoringConfig.salary.brackets;

describe('salaryScore', () => {
  it('returns 0 for zero salary', () => {
    expect(salaryScore(makeSummary(0), brackets)).toBe(0);
  });

  it('returns 5 for salary in 15k-25k band', () => {
    expect(salaryScore(makeSummary(20000), brackets)).toBe(5);
  });

  it('returns 10 for salary in 25k-40k band', () => {
    expect(salaryScore(makeSummary(30000), brackets)).toBe(10);
  });

  it('returns 15 for salary in 40k-60k band', () => {
    expect(salaryScore(makeSummary(50000), brackets)).toBe(15);
  });

  it('returns 20 for salary in 60k-100k band', () => {
    expect(salaryScore(makeSummary(75000), brackets)).toBe(20);
  });

  it('returns 25 for salary >= 100k', () => {
    expect(salaryScore(makeSummary(150000), brackets)).toBe(25);
  });

  it('never exceeds 25', () => {
    expect(salaryScore(makeSummary(1_000_000), brackets)).toBeLessThanOrEqual(25);
  });
});
