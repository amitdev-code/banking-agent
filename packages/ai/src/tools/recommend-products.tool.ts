import type {
  ProductRecommendation,
  ProductType,
  ScoredCustomer,
  TransactionSummary,
} from '@banking-crm/types';

import type { CrmSessionState } from '../graph/state';
import type { ToolResult, EmitTool } from './index';

function buildRecommendations(
  scored: ScoredCustomer,
  summary: TransactionSummary,
): ProductRecommendation[] {
  const recommendations: ProductRecommendation[] = [];
  const totalDebit = summary.totalDebitLast12Months;
  const shoppingDiningEntertainment = summary.categoryTotals
    .filter(
      (c) => ['SHOPPING', 'DINING', 'ENTERTAINMENT'].includes(c.category) && c.type === 'DEBIT',
    )
    .reduce((sum, c) => sum + c.total, 0);
  const hasHighLifestyleSpend = totalDebit > 0 && shoppingDiningEntertainment / totalDebit > 0.25;
  const avgSalary =
    summary.monthlySalaryCredits.filter((v) => v > 0).reduce((a, b) => a + b, 0) /
    Math.max(1, summary.monthlySalaryCredits.filter((v) => v > 0).length);

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
  if (hasHighLifestyleSpend) {
    recommendations.push({
      product: 'CREDIT_CARD' as ProductType,
      rationale: `High lifestyle spend (${Math.round((shoppingDiningEntertainment / totalDebit) * 100)}% of outflow) — rewards card opportunity`,
      confidence: Math.min(0.85, scored.conversionProbability + 0.05),
    });
  }
  if (recommendations.length === 0 && scored.qualifies) {
    recommendations.push({
      product: 'PERSONAL_LOAN' as ProductType,
      rationale: 'Strong financial profile — eligible for personal loan',
      confidence: scored.conversionProbability,
    });
  }
  return recommendations;
}

export async function runRecommendProducts(
  _input: Record<string, never>,
  state: CrmSessionState,
  deps: { emitTool: EmitTool },
): Promise<ToolResult> {
  if (state.scoredCustomers.length === 0) {
    return { summary: 'No scored customers. Run analyze_customers first.', stateUpdate: {} };
  }

  deps.emitTool(
    state.sessionId,
    'recommend_products',
    'start',
    'Matching products to qualified customers',
  );

  const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));
  const scoredCustomers = state.scoredCustomers.map((scored) => {
    const summary = summaryMap.get(scored.customerId);
    if (!summary || !scored.qualifies) return scored;
    return { ...scored, recommendedProducts: buildRecommendations(scored, summary) };
  });

  const withRecs = scoredCustomers.filter(
    (s) => s.qualifies && s.recommendedProducts.length > 0,
  ).length;
  const productBreakdown = ['PERSONAL_LOAN', 'HOME_LOAN', 'CREDIT_CARD']
    .map((product) => ({
      product,
      count: scoredCustomers.filter((s) => s.recommendedProducts.some((r) => r.product === product))
        .length,
    }))
    .filter((p) => p.count > 0);

  return {
    summary: `Matched products to ${withRecs} qualified customers`,
    stateUpdate: { scoredCustomers },
    resultType: 'recommendation_card',
    resultData: { totalCustomers: withRecs, productBreakdown },
  };
}
