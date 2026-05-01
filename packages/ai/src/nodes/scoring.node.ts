import type { ScoredCustomer } from '@banking-crm/types';

import { scoreCustomer } from '../scoring/engine';
import type { CrmState } from '../graph/state';

interface ScoringDeps {
  emitStep: (runId: string, step: string, status: string, detail?: string) => void;
}

export function createScoringNode(deps: ScoringDeps) {
  return async function scoringNode(
    state: CrmState,
  ): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'scoring', 'running');

    const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));

    const scoredCustomers: ScoredCustomer[] = state.customers.map((customer) => {
      const summary = summaryMap.get(customer.id);
      if (!summary) {
        return {
          customerId: customer.id,
          totalScore: 0,
          breakdown: { salary: 0, balance: 0, spending: 0, salaryCredited: 0, products: 0, age: 0, activity: 0 },
          readinessLabel: 'At-Risk' as const,
          conversionProbability: 0,
          recommendedProducts: [],
          hasExistingLoan: customer.hasActiveLoan,
          loanPenalty: 0,
          qualifies: false,
          disqualifiedReason: 'no_transaction_data',
        };
      }
      return scoreCustomer(customer, summary);
    });

    const qualifyingCount = scoredCustomers.filter((s) => s.qualifies).length;

    deps.emitStep(
      state.runId,
      'scoring',
      'done',
      `${qualifyingCount} of ${scoredCustomers.length} customers qualify`,
    );

    return { scoredCustomers };
  };
}
