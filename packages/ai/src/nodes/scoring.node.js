"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScoringNode = createScoringNode;
const engine_1 = require("../scoring/engine");
function createScoringNode(deps) {
    return async function scoringNode(state) {
        deps.emitStep(state.runId, 'scoring', 'running');
        const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));
        const scoredCustomers = state.customers.map((customer) => {
            const summary = summaryMap.get(customer.id);
            if (!summary) {
                return {
                    customerId: customer.id,
                    totalScore: 0,
                    breakdown: { salary: 0, balance: 0, spending: 0, salaryCredited: 0, products: 0, age: 0, activity: 0 },
                    readinessLabel: 'At-Risk',
                    conversionProbability: 0,
                    recommendedProducts: [],
                    hasExistingLoan: customer.hasActiveLoan,
                    loanPenalty: 0,
                    qualifies: false,
                    disqualifiedReason: 'no_transaction_data',
                };
            }
            return (0, engine_1.scoreCustomer)(customer, summary);
        });
        const qualifyingCount = scoredCustomers.filter((s) => s.qualifies).length;
        deps.emitStep(state.runId, 'scoring', 'done', `${qualifyingCount} of ${scoredCustomers.length} customers qualify`);
        return { scoredCustomers };
    };
}
