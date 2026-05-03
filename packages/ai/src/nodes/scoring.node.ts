import type { ScoredCustomer } from '@banking-crm/types';

import { scoreCustomer } from '../scoring/engine';
import type { CrmState } from '../graph/state';

interface ScoringDeps {
  emitStep: (runId: string, step: string, status: string, detail?: string, progress?: { current: number; total: number }) => void;
}

export function createScoringNode(deps: ScoringDeps) {
  return async function scoringNode(
    state: CrmState,
  ): Promise<Partial<CrmState>> {
    const total = state.customers.length;
    deps.emitStep(state.runId, 'scoring', 'running', `Scoring ${total} customers`, { current: 0, total });

    const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));

    const scoredCustomers: ScoredCustomer[] = [];
    const BATCH = 50;

    for (let i = 0; i < state.customers.length; i++) {
      const customer = state.customers[i]!;
      const summary = summaryMap.get(customer.id);
      if (!summary) {
        scoredCustomers.push({
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
        });
      } else {
        scoredCustomers.push(scoreCustomer(customer, summary, state.scoringConfig));
      }
      if ((i + 1) % BATCH === 0 && i + 1 < total) {
        const qualifying = scoredCustomers.filter((s) => s.qualifies).length;
        deps.emitStep(state.runId, 'scoring', 'running', `Scored ${i + 1} of ${total} (${qualifying} qualify so far)`, { current: i + 1, total });
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    const qualifyingCount = scoredCustomers.filter((s) => s.qualifies).length;

    deps.emitStep(
      state.runId,
      'scoring',
      'done',
      `${qualifyingCount} of ${scoredCustomers.length} customers qualify`,
      { current: scoredCustomers.length, total: scoredCustomers.length },
    );

    return { scoredCustomers };
  };
}
