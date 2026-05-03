export type ReadinessLabel = 'Primed' | 'Engaged' | 'Dormant' | 'At-Risk';

export type ProductType = 'PERSONAL_LOAN' | 'HOME_LOAN' | 'CREDIT_CARD';

export type CustomerPersona = 'Saver' | 'Spender' | 'Investor' | 'IrregularIncome' | 'Balanced';

export interface CustomerPersonaResult {
  customerId: string;
  persona: CustomerPersona;
}

export interface ScoreBreakdown {
  salary: number;
  balance: number;
  spending: number;
  salaryCredited: number;
  products: number;
  age: number;
  activity: number;
}

export interface ProductRecommendation {
  product: ProductType;
  rationale: string;
  confidence: number;
}

export interface ScoredCustomer {
  customerId: string;
  totalScore: number;
  breakdown: ScoreBreakdown;
  readinessLabel: ReadinessLabel;
  conversionProbability: number;
  recommendedProducts: ProductRecommendation[];
  hasExistingLoan: boolean;
  loanPenalty: number;
  qualifies: boolean;
  disqualifiedReason?: string;
  // AI-augmented fields
  scoreExplanation?: string;
  persona?: CustomerPersona;
  llmAdjustment?: number;
  llmAdjustReason?: string;
}
