"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SALARY_MAX = void 0;
exports.salaryScore = salaryScore;
exports.SALARY_MAX = 25;
function salaryScore(summary) {
    const credits = summary.monthlySalaryCredits;
    const presentMonths = credits.filter((v) => v > 0);
    if (presentMonths.length === 0)
        return 0;
    const avg = presentMonths.reduce((a, b) => a + b, 0) / presentMonths.length;
    if (avg >= 100_000)
        return 25;
    if (avg >= 60_000)
        return 20;
    if (avg >= 40_000)
        return 15;
    if (avg >= 25_000)
        return 10;
    if (avg >= 15_000)
        return 5;
    return 2;
}
