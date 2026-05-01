import { sigmoidProbability } from '../sigmoid';

describe('sigmoidProbability', () => {
  it('returns 0.5 at midpoint 75', () => {
    expect(sigmoidProbability(75)).toBe(0.5);
  });

  it('is strictly monotonically increasing', () => {
    const scores = [0, 25, 50, 75, 88, 100, 110];
    const probs = scores.map(sigmoidProbability);
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThan(probs[i - 1]!);
    }
  });

  it('output is always between 0 and 1 exclusive', () => {
    [-100, 0, 50, 75, 110, 200].forEach((score) => {
      const p = sigmoidProbability(score);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    });
  });

  it('rounds to 4 decimal places', () => {
    const p = sigmoidProbability(80);
    expect(p).toBe(Math.round(p * 10000) / 10000);
  });

  it('score >= 88 gives probability >= 0.81 (Primed threshold)', () => {
    expect(sigmoidProbability(88)).toBeGreaterThanOrEqual(0.81);
  });
});
