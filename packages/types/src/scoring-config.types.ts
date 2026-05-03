export interface ScoreBracket {
  min: number;
  score: number;
}

export interface AgeBracket {
  min: number;
  max: number;
  score: number;
}

export interface MonthBracket {
  minMonths: number;
  score: number;
}

export interface LoanPenaltyConfig {
  cap: number;
  personal: number;
  home: number;
  other: number;
}

export interface LlmHybridConfig {
  enabled: boolean;
  borderlineMin: number;
  borderlineMax: number;
  maxAdjustment: number;
}

export interface ScoringRulesConfig {
  qualifyThreshold: number;
  sigmoid: {
    midpoint: number;
    steepness: number;
  };
  readinessLabels: {
    primed: number;
    engaged: number;
    dormant: number;
  };
  regularIncomeMinMonths: number;
  salary: {
    maxScore: number;
    brackets: ScoreBracket[];
  };
  balance: {
    maxScore: number;
    brackets: ScoreBracket[];
  };
  salaryCredited: {
    maxScore: number;
    brackets: MonthBracket[];
  };
  age: {
    maxScore: number;
    brackets: AgeBracket[];
  };
  activity: {
    maxScore: number;
    brackets: ScoreBracket[];
  };
  spending: {
    maxScore: number;
  };
  products: {
    maxScore: number;
  };
  loanPenalty: LoanPenaltyConfig;
  llmHybrid: LlmHybridConfig;
}

export const defaultScoringConfig: ScoringRulesConfig = {
  qualifyThreshold: 75,
  sigmoid: { midpoint: 75, steepness: 0.06 },
  readinessLabels: { primed: 88, engaged: 75, dormant: 55 },
  regularIncomeMinMonths: 3,
  salary: {
    maxScore: 25,
    brackets: [
      { min: 100_000, score: 25 },
      { min: 60_000, score: 20 },
      { min: 40_000, score: 15 },
      { min: 25_000, score: 10 },
      { min: 15_000, score: 5 },
    ],
  },
  balance: {
    maxScore: 25,
    brackets: [
      { min: 250_000, score: 25 },
      { min: 100_000, score: 20 },
      { min: 50_000, score: 15 },
      { min: 20_000, score: 10 },
      { min: 5_000, score: 5 },
    ],
  },
  salaryCredited: {
    maxScore: 15,
    brackets: [
      { minMonths: 12, score: 15 },
      { minMonths: 10, score: 12 },
      { minMonths: 8, score: 9 },
      { minMonths: 6, score: 6 },
      { minMonths: 3, score: 3 },
    ],
  },
  age: {
    maxScore: 10,
    brackets: [
      { min: 28, max: 40, score: 10 },
      { min: 41, max: 55, score: 8 },
      { min: 22, max: 27, score: 6 },
      { min: 56, max: 65, score: 5 },
      { min: 18, max: 21, score: 2 },
    ],
  },
  activity: {
    maxScore: 5,
    brackets: [
      { min: 8, score: 5 },
      { min: 4, score: 3 },
      { min: 1, score: 1 },
    ],
  },
  spending: { maxScore: 20 },
  products: { maxScore: 10 },
  loanPenalty: { cap: 10, personal: 8, home: 3, other: 5 },
  llmHybrid: {
    enabled: true,
    borderlineMin: 55,
    borderlineMax: 82,
    maxAdjustment: 15,
  },
};
