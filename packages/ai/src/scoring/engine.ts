import type { Customer, ReadinessLabel, ScoredCustomer, TransactionSummary } from '@banking-crm/types';
import { defaultScoringConfig, type ScoringRulesConfig } from '@banking-crm/types';

import { activityScore } from './rules/activity.rule';
import { ageScore } from './rules/age.rule';
import { balanceScore } from './rules/balance.rule';
import { loanPenalty } from './rules/loan.rule';
import { productsScore } from './rules/products.rule';
import { salaryCreditedScore } from './rules/salary-credited.rule';
import { salaryScore } from './rules/salary.rule';
import { spendingScore } from './rules/spending.rule';
import { sigmoidProbability } from './sigmoid';

export function resolveReadinessLabel(
  score: number,
  labels: ScoringRulesConfig['readinessLabels'],
): ReadinessLabel {
  if (score >= labels.primed) return 'Primed';
  if (score >= labels.engaged) return 'Engaged';
  if (score >= labels.dormant) return 'Dormant';
  return 'At-Risk';
}

function hasRegularIncome(summary: TransactionSummary, minMonths: number): boolean {
  return summary.monthlySalaryCredits.filter((v) => v > 0).length >= minMonths;
}

export function scoreCustomer(
  customer: Customer,
  summary: TransactionSummary,
  config: ScoringRulesConfig = defaultScoringConfig,
): ScoredCustomer {
  if (!hasRegularIncome(summary, config.regularIncomeMinMonths)) {
    return {
      customerId: customer.id,
      totalScore: 0,
      breakdown: { salary: 0, balance: 0, spending: 0, salaryCredited: 0, products: 0, age: 0, activity: 0 },
      readinessLabel: 'At-Risk',
      conversionProbability: sigmoidProbability(0, config.sigmoid.midpoint, config.sigmoid.steepness),
      recommendedProducts: [],
      hasExistingLoan: summary.hasActiveLoan,
      loanPenalty: 0,
      qualifies: false,
      disqualifiedReason: 'no_regular_income',
    };
  }

  const breakdown = {
    salary:         salaryScore(summary, config.salary.brackets),
    balance:        balanceScore(summary, config.balance.brackets),
    spending:       spendingScore(summary, config.spending.maxScore),
    salaryCredited: salaryCreditedScore(summary, config.salaryCredited.brackets),
    products:       productsScore(summary, config.products.maxScore),
    age:            ageScore(customer, config.age.brackets),
    activity:       activityScore(summary, config.activity.brackets),
  };

  const baseScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const { penalty, hasExistingLoan } = loanPenalty(summary, config.loanPenalty);
  const totalScore = Math.max(0, baseScore - penalty);

  return {
    customerId: customer.id,
    totalScore,
    breakdown,
    readinessLabel: resolveReadinessLabel(totalScore, config.readinessLabels),
    conversionProbability: sigmoidProbability(totalScore, config.sigmoid.midpoint, config.sigmoid.steepness),
    recommendedProducts: [],
    hasExistingLoan,
    loanPenalty: penalty,
    qualifies: totalScore >= config.qualifyThreshold,
  };
}
