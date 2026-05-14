// Legacy pipeline graph (kept for history/backward compat)
export { buildCrmGraph } from './graph/crm.graph';
export type { CrmGraphDeps, CompiledCrmGraph } from './graph/crm.graph';

// New dynamic agent graph
export { buildAgentGraph } from './graph/agent.graph';
export { HumanMessage } from '@langchain/core/messages';
export { Command } from '@langchain/langgraph';
export type { AgentGraphDeps, CompiledAgentGraph } from './graph/agent.graph';

export { createCheckpointer } from './graph/checkpointer';
export { CrmAgentAnnotation, CrmSessionAnnotation } from './graph/state';
export type { CrmState, CrmSessionState } from './graph/state';
export { scoreCustomer } from './scoring/engine';
export { sigmoidProbability } from './scoring/sigmoid';
export { buildTransactionSummaries } from './utils/transaction-aggregator';
export { sanitizeFilters } from './utils/filter-parser';
