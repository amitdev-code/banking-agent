import type { Customer, ScoredCustomer, TransactionSummary, ReadinessLabel } from '@banking-crm/types';

import { activityScore } from './rules/activity.rule';
import { ageScore } from './rules/age.rule';
import { balanceScore } from './rules/balance.rule';
import { loanPenalty } from './rules/loan.rule';
import { productsScore } from './rules/products.rule';
import { salaryCreditedScore } from './rules/salary-credited.rule';
import { salaryScore } from './rules/salary.rule';
import { spendingScore } from './rules/spending.rule';
import { sigmoidProbability } from './sigmoid';

const QUALIFY_THRESHOLD = 75;

function resolveReadinessLabel(score: number): ReadinessLabel {
  if (score >= 88) return 'Primed';
  if (score >= 75) return 'Engaged';
  if (score >= 55) return 'Dormant';
  return 'At-Risk';
}

function hasRegularIncome(summary: TransactionSummary): boolean {
  const monthsWithSalary = summary.monthlySalaryCredits.filter((v) => v > 0).length;
  return monthsWithSalary >= 3;
}

export function scoreCustomer(
  customer: Customer,
  summary: TransactionSummary,
): ScoredCustomer {
  // Hard exclusion: no regular income in last 12 months
  if (!hasRegularIncome(summary)) {
    return {
      customerId: customer.id,
      totalScore: 0,
      breakdown: { salary: 0, balance: 0, spending: 0, salaryCredited: 0, products: 0, age: 0, activity: 0 },
      readinessLabel: 'At-Risk',
      conversionProbability: sigmoidProbability(0),
      recommendedProducts: [],
      hasExistingLoan: summary.hasActiveLoan,
      loanPenalty: 0,
      qualifies: false,
      disqualifiedReason: 'no_regular_income',
    };
  }

  const breakdown = {
    salary: salaryScore(summary),
    balance: balanceScore(summary),
    spending: spendingScore(summary),
    salaryCredited: salaryCreditedScore(summary),
    products: productsScore(summary),
    age: ageScore(customer),
    activity: activityScore(summary),
  };

  const baseScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  const { penalty, hasExistingLoan, loanType } = loanPenalty(summary);
  const totalScore = Math.max(0, baseScore - penalty);

  return {
    customerId: customer.id,
    totalScore,
    breakdown,
    readinessLabel: resolveReadinessLabel(totalScore),
    conversionProbability: sigmoidProbability(totalScore),
    recommendedProducts: [],
    hasExistingLoan,
    loanPenalty: penalty,
    qualifies: totalScore >= QUALIFY_THRESHOLD,
  };
}
