"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sigmoidProbability = sigmoidProbability;
const MIDPOINT = 75;
const STEEPNESS = 0.06;
function sigmoidProbability(score, midpoint = MIDPOINT, steepness = STEEPNESS) {
    const raw = 1 / (1 + Math.exp(-steepness * (score - midpoint)));
    return Math.round(raw * 10000) / 10000;
}
