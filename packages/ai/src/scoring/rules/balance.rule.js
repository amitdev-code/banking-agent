"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCE_MAX = void 0;
exports.balanceScore = balanceScore;
exports.BALANCE_MAX = 25;
function balanceScore(summary) {
    const avg = summary.avgMonthlyBalance;
    if (avg >= 250_000)
        return 25;
    if (avg >= 100_000)
        return 20;
    if (avg >= 50_000)
        return 15;
    if (avg >= 20_000)
        return 10;
    if (avg >= 5_000)
        return 5;
    return 0;
}
