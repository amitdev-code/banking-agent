import * as fc from 'fast-check';
import { scoreCustomer } from '../engine';
import { sigmoidProbability } from '../sigmoid';
import type { Customer, TransactionSummary } from '@banking-crm/types';

const arbCustomer = fc.record<Customer>({
  id: fc.uuid(),
  tenantId: fc.uuid(),
  fullName: fc.string({ minLength: 1 }),
  phone: fc.string({ minLength: 10, maxLength: 10 }),
  email: fc.emailAddress(),
  pan: fc.constant('ABCDE1234F'),
  aadhaar: fc.constant('123456789012'),
  accountNumber: fc.string(),
  address: fc.string(),
  dob: fc.constant(new Date('1990-01-01')),
  city: fc.constantFrom('Mumbai', 'Delhi', 'Bangalore'),
  age: fc.integer({ min: 18, max: 80 }),
  segment: fc.constantFrom('retail', 'premium', 'sme', 'nri'),
  accountType: fc.constantFrom('savings', 'current', 'salary'),
  kycStatus: fc.constantFrom('verified', 'pending', 'failed'),
  joinedAt: fc.constant(new Date('2020-01-01')),
  avgMonthlyBalance: fc.float({ min: 0, max: 10_000_000 }),
  hasActiveLoan: fc.boolean(),
  loanType: fc.constantFrom('personal', 'home', 'other', null),
  createdAt: fc.constant(new Date()),
});

const arbSummary = fc.record<TransactionSummary>({
  customerId: fc.uuid(),
  monthlySalaryCredits: fc.array(fc.float({ min: 0, max: 500_000 }), { minLength: 0, maxLength: 12 }),
  avgMonthlyBalance: fc.float({ min: 0, max: 10_000_000 }),
  totalCreditLast12Months: fc.float({ min: 0, max: 6_000_000 }),
  totalDebitLast12Months: fc.float({ min: 0, max: 5_000_000 }),
  categoryTotals: fc.constant([]),
  transactionCountLast30Days: fc.integer({ min: 0, max: 200 }),
  hasRegularIncome: fc.boolean(),
  hasActiveLoan: fc.boolean(),
  loanType: fc.constantFrom('personal', 'home', 'other', null),
});

describe('scoreCustomer property-based tests', () => {
  it('totalScore is always in [0, 110]', () => {
    fc.assert(
      fc.property(arbCustomer, arbSummary, (customer, summary) => {
        const result = scoreCustomer(customer, summary);
        return result.totalScore >= 0 && result.totalScore <= 110;
      })
    );
  });

  it('customers with empty monthlySalaryCredits always get qualifies=false', () => {
    fc.assert(
      fc.property(arbCustomer, arbSummary, (customer, summary) => {
        const result = scoreCustomer(customer, { ...summary, monthlySalaryCredits: [] });
        return result.qualifies === false;
      })
    );
  });

  it('loan penalty never reduces score below 0', () => {
    fc.assert(
      fc.property(arbCustomer, arbSummary, (customer, summary) => {
        const result = scoreCustomer(customer, summary);
        return result.totalScore >= 0;
      })
    );
  });

  it('sigmoid output is always in [0, 1]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (score) => {
        const p = sigmoidProbability(score);
        return p >= 0 && p <= 1;
      })
    );
  });
});
