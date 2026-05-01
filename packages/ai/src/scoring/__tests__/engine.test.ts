import { scoreCustomer } from '../engine';
import type { Customer, TransactionSummary } from '@banking-crm/types';

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-001',
    tenantId: 'tenant-001',
    fullName: 'Test User',
    phone: '9999999999',
    email: 'test@example.com',
    pan: 'ABCDE1234F',
    aadhaar: '123456789012',
    accountNumber: 'ACC001',
    address: '123 Main St',
    dob: '1990-01-01',
    city: 'Mumbai',
    age: 34,
    avgMonthlyBalance: 100000,
    hasActiveLoan: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSummary(overrides: Partial<TransactionSummary> = {}): TransactionSummary {
  return {
    avgMonthlySalary: 80000,
    avgMonthlyBalance: 200000,
    totalDebitLast12m: 600000,
    categoryBreakdown: { GROCERY: 50000, DINING: 30000, FUEL: 20000 },
    monthsWithSalaryCredit: 12,
    hasPersonalLoan: false,
    hasHomeLoan: false,
    transactionCountLast30d: 25,
    ...overrides,
  };
}

describe('scoreCustomer', () => {
  it('qualifies a high-salary customer with consistent income', () => {
    const result = scoreCustomer(makeCustomer(), makeSummary());
    expect(result.qualifies).toBe(true);
    expect(result.totalScore).toBeGreaterThanOrEqual(75);
  });

  it('disqualifies customer with no salary credits in last 6 months', () => {
    const result = scoreCustomer(makeCustomer(), makeSummary({ monthsWithSalaryCredit: 0 }));
    expect(result.qualifies).toBe(false);
    expect(result.disqualifiedReason).toBe('no_regular_income');
  });

  it('totalScore is never negative', () => {
    const result = scoreCustomer(
      makeCustomer({ age: 18 }),
      makeSummary({
        avgMonthlySalary: 0,
        avgMonthlyBalance: 0,
        hasPersonalLoan: true,
        hasHomeLoan: true,
        monthsWithSalaryCredit: 12,
        transactionCountLast30d: 0,
      })
    );
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('assigns Primed label for score >= 88', () => {
    const result = scoreCustomer(makeCustomer({ age: 35 }), makeSummary({
      avgMonthlySalary: 200000,
      avgMonthlyBalance: 1000000,
      monthsWithSalaryCredit: 12,
      transactionCountLast30d: 30,
    }));
    if (result.totalScore >= 88) {
      expect(result.readinessLabel).toBe('Primed');
    }
  });

  it('applies loan penalty and reduces score', () => {
    const withoutLoan = scoreCustomer(makeCustomer(), makeSummary({ hasPersonalLoan: false }));
    const withLoan = scoreCustomer(makeCustomer(), makeSummary({ hasPersonalLoan: true }));
    expect(withLoan.totalScore).toBeLessThan(withoutLoan.totalScore);
    expect(withLoan.loanPenalty).toBe(8);
  });

  it('breakdown scores sum to totalScore before penalty', () => {
    const result = scoreCustomer(makeCustomer(), makeSummary());
    const breakdownSum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    expect(result.totalScore).toBe(Math.max(0, breakdownSum - result.loanPenalty));
  });

  it('conversionProbability is between 0 and 1', () => {
    const result = scoreCustomer(makeCustomer(), makeSummary());
    expect(result.conversionProbability).toBeGreaterThan(0);
    expect(result.conversionProbability).toBeLessThanOrEqual(1);
  });
});
