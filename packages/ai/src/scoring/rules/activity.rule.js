"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVITY_MAX = void 0;
exports.activityScore = activityScore;
exports.ACTIVITY_MAX = 5;
function activityScore(summary) {
    const count = summary.transactionCountLast30Days;
    if (count > 7)
        return 5;
    if (count >= 4)
        return 3;
    if (count >= 1)
        return 1;
    return 0;
}
