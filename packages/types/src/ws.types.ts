// ─── Session (new dynamic agent) events ──────────────────────────────────────

export interface ToolStartEvent {
  sessionId: string;
  tool: string;
  input?: Record<string, unknown>;
  timestamp: number;
}

export interface ToolDoneEvent {
  sessionId: string;
  tool: string;
  durationMs: number;
  resultSummary: string;
  timestamp: number;
}

export interface ToolErrorEvent {
  sessionId: string;
  tool: string;
  error: string;
  timestamp: number;
}

export interface MessageCompleteEvent {
  sessionId: string;
  messageId: string;
  content: string;
  toolCalls: Array<{
    toolName: string;
    input: Record<string, unknown>;
    resultSummary: string;
    durationMs: number;
  }>;
  resultType: string | null;
  resultData: unknown | null;
  timestamp: number;
}

export interface SessionAwaitingApprovalEvent {
  sessionId: string;
  qualifiedCount: number;
  timestamp: number;
}

export interface SessionErrorEvent {
  sessionId: string;
  error: string;
  timestamp: number;
}

// ─── Legacy pipeline events (kept for /history compatibility) ────────────────

export type WorkflowStepName =
  | 'planner'
  | 'fetchCustomers'
  | 'fetchTransactions'
  | 'behaviorPersona'
  | 'scoring'
  | 'llmScoreAdjust'
  | 'scoreExplainer'
  | 'recommendation'
  | 'message';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface WorkflowStepProgress {
  current: number;
  total: number;
}

export interface WorkflowStepEvent {
  runId: string;
  step: WorkflowStepName;
  status: StepStatus;
  detail?: string;
  progress?: WorkflowStepProgress;
  timestamp: number;
}

export interface WorkflowCompleteEvent {
  runId: string;
  customerCount: number;
  highValueCount: number;
  avgScore: number;
}

export interface WorkflowAwaitingSelectionEvent {
  runId: string;
  customerCount: number;
}

export interface WorkflowAwaitingApprovalEvent {
  runId: string;
  scoredCount: number;
  qualifiedCount: number;
  avgScore: number;
}

export interface WorkflowErrorEvent {
  runId: string;
  error: string;
  step?: WorkflowStepName;
}

export const WORKFLOW_STEP_LABELS: Record<WorkflowStepName, string> = {
  planner: 'Query Planning',
  fetchCustomers: 'Fetching Customers',
  fetchTransactions: 'Fetching Transactions',
  behaviorPersona: 'Detecting Personas',
  scoring: 'Scoring Customers',
  llmScoreAdjust: 'AI Score Adjustment',
  scoreExplainer: 'Generating Explanations',
  recommendation: 'Recommending Products',
  message: 'Generating Messages',
};

export const WORKFLOW_STEP_ORDER: WorkflowStepName[] = [
  'planner',
  'fetchCustomers',
  'fetchTransactions',
  'behaviorPersona',
  'scoring',
  'llmScoreAdjust',
  'scoreExplainer',
  'recommendation',
  'message',
];
