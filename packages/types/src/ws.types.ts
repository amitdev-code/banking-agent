export type WorkflowStepName =
  | 'planner'
  | 'fetchCustomers'
  | 'fetchTransactions'
  | 'scoring'
  | 'recommendation'
  | 'message';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface WorkflowStepEvent {
  runId: string;
  step: WorkflowStepName;
  status: StepStatus;
  detail?: string;
  timestamp: number;
}

export interface WorkflowCompleteEvent {
  runId: string;
  customerCount: number;
  highValueCount: number;
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
  scoring: 'Scoring Customers',
  recommendation: 'Recommending Products',
  message: 'Generating Messages',
};

export const WORKFLOW_STEP_ORDER: WorkflowStepName[] = [
  'planner',
  'fetchCustomers',
  'fetchTransactions',
  'scoring',
  'recommendation',
  'message',
];
