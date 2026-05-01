const MIDPOINT = 75;
const STEEPNESS = 0.06;

export function sigmoidProbability(
  score: number,
  midpoint: number = MIDPOINT,
  steepness: number = STEEPNESS,
): number {
  const raw = 1 / (1 + Math.exp(-steepness * (score - midpoint)));
  return Math.round(raw * 10000) / 10000;
}
