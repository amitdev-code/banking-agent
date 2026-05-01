import { salaryScore } from '../rules/salary.rule';
import type { TransactionSummary } from '@banking-crm/types';

function makeSummary(avgMonthlySalary: number): TransactionSummary {
  return {
    avgMonthlySalary,
    avgMonthlyBalance: 0,
    totalDebitLast12m: 0,
    categoryBreakdown: {},
    monthsWithSalaryCredit: 12,
    hasPersonalLoan: false,
    hasHomeLoan: false,
    transactionCountLast30d: 5,
  };
}

describe('salaryScore', () => {
  it('returns 0 for zero salary', () => {
    expect(salaryScore(makeSummary(0))).toBe(0);
  });

  it('returns 8 for salary in 15k-25k band', () => {
    expect(salaryScore(makeSummary(20000))).toBe(8);
  });

  it('returns 15 for salary in 25k-50k band', () => {
    expect(salaryScore(makeSummary(40000))).toBe(15);
  });

  it('returns 20 for salary in 50k-100k band', () => {
    expect(salaryScore(makeSummary(75000))).toBe(20);
  });

  it('returns 25 for salary >= 100k', () => {
    expect(salaryScore(makeSummary(150000))).toBe(25);
  });

  it('never exceeds 25', () => {
    expect(salaryScore(makeSummary(1_000_000))).toBeLessThanOrEqual(25);
  });
});
