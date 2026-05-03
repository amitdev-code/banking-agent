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
    dob: new Date('1990-01-01'),
    city: 'Mumbai',
    age: 34,
    segment: 'retail',
    accountType: 'savings',
    kycStatus: 'verified',
    joinedAt: new Date('2020-01-01'),
    avgMonthlyBalance: 100000,
    hasActiveLoan: false,
    loanType: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeSummary(overrides: Partial<TransactionSummary> = {}): TransactionSummary {
  return {
    customerId: 'cust-001',
    monthlySalaryCredits: Array(12).fill(80000),
    avgMonthlyBalance: 200000,
    totalCreditLast12Months: 960000,
    totalDebitLast12Months: 600000,
    categoryTotals: [
      { category: 'GROCERY', type: 'DEBIT', total: 50000, count: 12 },
      { category: 'DINING',  type: 'DEBIT', total: 30000, count: 12 },
      { category: 'FUEL',    type: 'DEBIT', total: 20000, count: 12 },
    ],
    transactionCountLast30Days: 25,
    hasRegularIncome: true,
    hasActiveLoan: false,
    loanType: null,
    ...overrides,
  };
}

describe('scoreCustomer', () => {
  it('qualifies a high-salary customer with consistent income', () => {
    const result = scoreCustomer(makeCustomer(), makeSummary());
    expect(result.qualifies).toBe(true);
    expect(result.totalScore).toBeGreaterThanOrEqual(75);
  });

  it('disqualifies customer with no salary credits', () => {
    const result = scoreCustomer(makeCustomer(), makeSummary({ monthlySalaryCredits: [] }));
    expect(result.qualifies).toBe(false);
    expect(result.disqualifiedReason).toBe('no_regular_income');
  });

  it('totalScore is never negative', () => {
    const result = scoreCustomer(
      makeCustomer({ age: 18 }),
      makeSummary({
        monthlySalaryCredits: Array(12).fill(0).map((_, i) => i < 3 ? 5000 : 0),
        avgMonthlyBalance: 0,
        hasActiveLoan: true,
        loanType: 'personal',
        transactionCountLast30Days: 0,
      })
    );
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('assigns Primed label for score >= 88', () => {
    const result = scoreCustomer(makeCustomer({ age: 35 }), makeSummary({
      monthlySalaryCredits: Array(12).fill(200000),
      avgMonthlyBalance: 1000000,
      totalCreditLast12Months: 2400000,
      transactionCountLast30Days: 30,
    }));
    if (result.totalScore >= 88) {
      expect(result.readinessLabel).toBe('Primed');
    }
  });

  it('applies loan penalty and reduces score', () => {
    const withoutLoan = scoreCustomer(makeCustomer(), makeSummary({ hasActiveLoan: false, loanType: null }));
    const withLoan    = scoreCustomer(makeCustomer(), makeSummary({ hasActiveLoan: true, loanType: 'personal' }));
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
