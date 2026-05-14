import type { AgentMode, RunStatus } from './crm.types';
import type { Customer, CustomerFilters } from './customer.types';
import type { CustomerPersonaResult, ProductRecommendation, ScoredCustomer } from './scoring.types';
import type { ScoringRulesConfig } from './scoring-config.types';
import type { TransactionSummary } from './transaction.types';

export interface GeneratedMessage {
  customerId: string;
  english: string;
  hindi: string;
  isEdited: boolean;
  editedContent?: string;
}

export interface SpendingInsight {
  customerId: string;
  summary: string;
  keyCategories: string[];
  riskFlags: string[];
  opportunities: string[];
}

export interface CrmAgentState {
  runId: string;
  tenantId: string;
  mode: AgentMode;
  naturalLanguageQuery?: string;
  resolvedFilters: CustomerFilters;
  customers: Customer[];
  transactionSummaries: TransactionSummary[];
  scoredCustomers: ScoredCustomer[];
  customerPersonas: CustomerPersonaResult[];
  recommendations: ProductRecommendation[];
  generatedMessages: GeneratedMessage[];
  spendingInsights?: SpendingInsight[];
  scoringConfig: ScoringRulesConfig;
  error?: string;
  isPaused: boolean;
  plannerNote?: string;
}

export interface WorkflowRunMeta {
  runId: string;
  tenantId: string;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
}
