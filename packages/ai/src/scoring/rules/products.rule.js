"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCTS_MAX = void 0;
exports.productsScore = productsScore;
exports.PRODUCTS_MAX = 10;
function productsScore(summary) {
    let score = 0;
    // Infer product absence from transaction patterns (headroom = cross-sell opportunity)
    const hasHighShoppingOrDining = summary.categoryTotals
        .filter((c) => ['SHOPPING', 'DINING', 'ENTERTAINMENT'].includes(c.category) && c.type === 'DEBIT')
        .reduce((sum, c) => sum + c.total, 0);
    const totalDebit = summary.totalDebitLast12Months;
    // No credit card pattern inferred if shopping/dining/entertainment < 15% of total spend
    const hasNoCreditCardUsage = totalDebit > 0 && hasHighShoppingOrDining / totalDebit < 0.15;
    if (hasNoCreditCardUsage)
        score += 4;
    // No home loan (we rely on summary.hasActiveLoan + loanType for this)
    if (!summary.hasActiveLoan || summary.loanType === 'personal')
        score += 3;
    // No personal loan
    if (!summary.hasActiveLoan)
        score += 3;
    else if (summary.loanType !== 'personal')
        score += 1;
    return Math.min(score, exports.PRODUCTS_MAX);
}
