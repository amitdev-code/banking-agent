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
  dob: fc.constant('1990-01-01'),
  city: fc.constantFrom('Mumbai', 'Delhi', 'Bangalore'),
  age: fc.integer({ min: 18, max: 80 }),
  avgMonthlyBalance: fc.float({ min: 0, max: 10_000_000 }),
  hasActiveLoan: fc.boolean(),
  createdAt: fc.constant(new Date().toISOString()),
  updatedAt: fc.constant(new Date().toISOString()),
});

const arbSummary = fc.record<TransactionSummary>({
  avgMonthlySalary: fc.float({ min: 0, max: 500_000 }),
  avgMonthlyBalance: fc.float({ min: 0, max: 10_000_000 }),
  totalDebitLast12m: fc.float({ min: 0, max: 5_000_000 }),
  categoryBreakdown: fc.constant({}),
  monthsWithSalaryCredit: fc.integer({ min: 0, max: 12 }),
  hasPersonalLoan: fc.boolean(),
  hasHomeLoan: fc.boolean(),
  transactionCountLast30d: fc.integer({ min: 0, max: 200 }),
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

  it('customers with 0 monthsWithSalaryCredit always get qualifies=false', () => {
    fc.assert(
      fc.property(arbCustomer, arbSummary, (customer, summary) => {
        const result = scoreCustomer(customer, { ...summary, monthsWithSalaryCredit: 0 });
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

  it('sigmoid output is always in (0, 1)', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (score) => {
        const p = sigmoidProbability(score);
        return p > 0 && p < 1;
      })
    );
  });
});
