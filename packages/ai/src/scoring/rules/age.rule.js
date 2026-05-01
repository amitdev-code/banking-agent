"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGE_MAX = void 0;
exports.ageScore = ageScore;
exports.AGE_MAX = 10;
function ageScore(customer) {
    const { age } = customer;
    if (age >= 28 && age <= 40)
        return 10;
    if (age >= 41 && age <= 55)
        return 8;
    if (age >= 22 && age <= 27)
        return 6;
    if (age >= 56 && age <= 65)
        return 5;
    if (age >= 18 && age <= 21)
        return 2;
    return 2;
}
