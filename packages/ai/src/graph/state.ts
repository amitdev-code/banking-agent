import { Annotation } from '@langchain/langgraph';

import type {
  AgentMode,
  Customer,
  CustomerFilters,
  GeneratedMessage,
  ProductRecommendation,
  ScoredCustomer,
  TransactionSummary,
} from '@banking-crm/types';

export const CrmAgentAnnotation = Annotation.Root({
  runId: Annotation<string>(),
  tenantId: Annotation<string>(),
  mode: Annotation<AgentMode>(),
  naturalLanguageQuery: Annotation<string | undefined>(),

  resolvedFilters: Annotation<CustomerFilters>({
    reducer: (existing, update) => ({ ...existing, ...update }),
    default: () => ({}),
  }),

  customers: Annotation<Customer[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  transactionSummaries: Annotation<TransactionSummary[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  scoredCustomers: Annotation<ScoredCustomer[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  recommendations: Annotation<ProductRecommendation[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  generatedMessages: Annotation<GeneratedMessage[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  isPaused: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),

  error: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),

  plannerNote: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
});

export type CrmState = typeof CrmAgentAnnotation.State;
