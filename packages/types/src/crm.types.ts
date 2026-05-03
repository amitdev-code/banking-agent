import type { CustomerFilters } from './customer.types';

export type AgentMode = 'agent' | 'custom';

export type RunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';

export interface CrmRunRequest {
  mode: AgentMode;
  naturalLanguageQuery?: string;
  filters?: CustomerFilters;
}

export interface CrmRunResponse {
  runId: string;
}

export interface AnalysisRunSummary {
  id: string;
  tenantId: string;
  userId: string;
  mode: AgentMode;
  status: RunStatus;
  query: string | null;
  customerCount: number;
  highValueCount: number;
  avgScore: number;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ScoredResultRecord {
  id: string;
  runId: string;
  customerId: string;
  totalScore: number;
  readinessLabel: string;
  conversionProbability: number;
  qualifies: boolean;
  breakdown: Record<string, number>;
  recommendations: Array<{ product: string; rationale: string; confidence: number }>;
  messageEn: string | null;
  messageHi: string | null;
  isMessageEdited: boolean;
  editedMessage: string | null;
  hasExistingLoan: boolean;
  loanPenalty: number;
  disqualifiedReason: string | null;
  scoreExplanation: string | null;
  persona: string | null;
  llmAdjustment: number | null;
  llmAdjustReason: string | null;
  createdAt: Date;
}

export interface UpdateMessageRequest {
  editedMessage: string;
}

export interface HistoryListResponse {
  items: AnalysisRunSummary[];
  total: number;
  page: number;
  limit: number;
}
