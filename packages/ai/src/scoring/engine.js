"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCustomer = scoreCustomer;
const activity_rule_1 = require("./rules/activity.rule");
const age_rule_1 = require("./rules/age.rule");
const balance_rule_1 = require("./rules/balance.rule");
const loan_rule_1 = require("./rules/loan.rule");
const products_rule_1 = require("./rules/products.rule");
const salary_credited_rule_1 = require("./rules/salary-credited.rule");
const salary_rule_1 = require("./rules/salary.rule");
const spending_rule_1 = require("./rules/spending.rule");
const sigmoid_1 = require("./sigmoid");
const QUALIFY_THRESHOLD = 75;
function resolveReadinessLabel(score) {
    if (score >= 88)
        return 'Primed';
    if (score >= 75)
        return 'Engaged';
    if (score >= 55)
        return 'Dormant';
    return 'At-Risk';
}
function hasRegularIncome(summary) {
    const monthsWithSalary = summary.monthlySalaryCredits.filter((v) => v > 0).length;
    return monthsWithSalary >= 3;
}
function scoreCustomer(customer, summary) {
    // Hard exclusion: no regular income in last 12 months
    if (!hasRegularIncome(summary)) {
        return {
            customerId: customer.id,
            totalScore: 0,
            breakdown: { salary: 0, balance: 0, spending: 0, salaryCredited: 0, products: 0, age: 0, activity: 0 },
            readinessLabel: 'At-Risk',
            conversionProbability: (0, sigmoid_1.sigmoidProbability)(0),
            recommendedProducts: [],
            hasExistingLoan: summary.hasActiveLoan,
            loanPenalty: 0,
            qualifies: false,
            disqualifiedReason: 'no_regular_income',
        };
    }
    const breakdown = {
        salary: (0, salary_rule_1.salaryScore)(summary),
        balance: (0, balance_rule_1.balanceScore)(summary),
        spending: (0, spending_rule_1.spendingScore)(summary),
        salaryCredited: (0, salary_credited_rule_1.salaryCreditedScore)(summary),
        products: (0, products_rule_1.productsScore)(summary),
        age: (0, age_rule_1.ageScore)(customer),
        activity: (0, activity_rule_1.activityScore)(summary),
    };
    const baseScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    const { penalty, hasExistingLoan, loanType } = (0, loan_rule_1.loanPenalty)(summary);
    const totalScore = Math.max(0, baseScore - penalty);
    return {
        customerId: customer.id,
        totalScore,
        breakdown,
        readinessLabel: resolveReadinessLabel(totalScore),
        conversionProbability: (0, sigmoid_1.sigmoidProbability)(totalScore),
        recommendedProducts: [],
        hasExistingLoan,
        loanPenalty: penalty,
        qualifies: totalScore >= QUALIFY_THRESHOLD,
    };
}
