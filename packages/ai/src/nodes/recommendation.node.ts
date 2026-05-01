import type { ProductRecommendation, ProductType, ScoredCustomer, TransactionSummary } from '@banking-crm/types';

import type { CrmState } from '../graph/state';

interface RecommendationDeps {
  emitStep: (runId: string, step: string, status: string) => void;
}

function buildRecommendations(
  scored: ScoredCustomer,
  summary: TransactionSummary,
): ProductRecommendation[] {
  const recommendations: ProductRecommendation[] = [];
  const totalDebit = summary.totalDebitLast12Months;

  const shoppingDiningEntertainment = summary.categoryTotals
    .filter((c) => ['SHOPPING', 'DINING', 'ENTERTAINMENT'].includes(c.category) && c.type === 'DEBIT')
    .reduce((sum, c) => sum + c.total, 0);

  const hasHighLifestyleSpend = totalDebit > 0 && shoppingDiningEntertainment / totalDebit > 0.25;

  const avgSalary =
    summary.monthlySalaryCredits.filter((v) => v > 0).reduce((a, b) => a + b, 0) /
    Math.max(1, summary.monthlySalaryCredits.filter((v) => v > 0).length);

  // Personal Loan: qualifies + high spending relative to income + no personal loan
  if (scored.qualifies && !scored.hasExistingLoan) {
    const spendRatio =
      summary.totalCreditLast12Months > 0
        ? summary.totalDebitLast12Months / summary.totalCreditLast12Months
        : 0;
    if (spendRatio >= 0.5) {
      recommendations.push({
        product: 'PERSONAL_LOAN' as ProductType,
        rationale: `Spending-to-income ratio of ${Math.round(spendRatio * 100)}% indicates loan eligibility`,
        confidence: Math.min(0.95, scored.conversionProbability + 0.1),
      });
    }
  }

  // Home Loan: stable salary, age 25-50, no existing home loan, sufficient balance
  if (
    avgSalary >= 40000 &&
    summary.avgMonthlyBalance >= 50000 &&
    (!scored.hasExistingLoan || summary.loanType === 'personal')
  ) {
    recommendations.push({
      product: 'HOME_LOAN' as ProductType,
      rationale: `Stable income of ₹${Math.round(avgSalary / 1000)}k/month with strong balance`,
      confidence: Math.min(0.9, scored.conversionProbability),
    });
  }

  // Credit Card: high lifestyle spending, no credit card usage detected
  if (hasHighLifestyleSpend) {
    recommendations.push({
      product: 'CREDIT_CARD' as ProductType,
      rationale: `High lifestyle spend (${Math.round((shoppingDiningEntertainment / totalDebit) * 100)}% of outflow) — rewards card opportunity`,
      confidence: Math.min(0.85, scored.conversionProbability + 0.05),
    });
  }

  // Always recommend at least one product for qualified customers
  if (recommendations.length === 0 && scored.qualifies) {
    recommendations.push({
      product: 'PERSONAL_LOAN' as ProductType,
      rationale: 'Strong financial profile — eligible for personal loan',
      confidence: scored.conversionProbability,
    });
  }

  return recommendations;
}

export function createRecommendationNode(deps: RecommendationDeps) {
  return async function recommendationNode(
    state: CrmState,
  ): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'recommendation', 'running');

    const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));

    const scoredWithRecs: ScoredCustomer[] = state.scoredCustomers.map((scored) => {
      const summary = summaryMap.get(scored.customerId);
      if (!summary || !scored.qualifies) return scored;
      return {
        ...scored,
        recommendedProducts: buildRecommendations(scored, summary),
      };
    });

    deps.emitStep(state.runId, 'recommendation', 'done');
    return { scoredCustomers: scoredWithRecs };
  };
}
