"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOAN_PENALTY_CAP = void 0;
exports.loanPenalty = loanPenalty;
exports.LOAN_PENALTY_CAP = 10;
function loanPenalty(summary) {
    if (!summary.hasActiveLoan) {
        return { penalty: 0, hasExistingLoan: false, loanType: null };
    }
    const loanType = summary.loanType;
    let penalty = 0;
    if (loanType === 'personal')
        penalty = 8;
    else if (loanType === 'home')
        penalty = 3;
    else
        penalty = 5;
    // Cap combined penalty
    penalty = Math.min(penalty, exports.LOAN_PENALTY_CAP);
    return { penalty, hasExistingLoan: true, loanType };
}
