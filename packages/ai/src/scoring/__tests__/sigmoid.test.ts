import { sigmoidProbability } from '../sigmoid';

describe('sigmoidProbability', () => {
  it('returns 0.5 at midpoint 75', () => {
    expect(sigmoidProbability(75)).toBe(0.5);
  });

  it('is strictly monotonically increasing', () => {
    const scores = [0, 25, 50, 75, 88, 100, 110];
    const probs = scores.map((s) => sigmoidProbability(s));
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThan(probs[i - 1]!);
    }
  });

  it('output is always between 0 and 1 exclusive for typical score range', () => {
    [0, 50, 75, 110].forEach((score) => {
      const p = sigmoidProbability(score);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    });
  });

  it('rounds to 4 decimal places', () => {
    const p = sigmoidProbability(80);
    expect(p).toBe(Math.round(p * 10000) / 10000);
  });

  it('score >= 88 gives higher probability than score 75', () => {
    expect(sigmoidProbability(88)).toBeGreaterThan(sigmoidProbability(75));
  });

  it('accepts custom midpoint and steepness', () => {
    expect(sigmoidProbability(100, 100, 0.1)).toBe(0.5);
  });
});
