export type SessionStatus = 'ACTIVE' | 'ARCHIVED';
export type MessageRole = 'USER' | 'ASSISTANT';

export type ToolCallRecord = {
  toolName: string;
  input: Record<string, unknown>;
  resultSummary: string;
  durationMs: number;
};

export type ResultType =
  | 'customer_list'
  | 'score_card'
  | 'recommendation_card'
  | 'message_card'
  | 'spending_analytics_card';

export interface CrmSession {
  id: string;
  tenantId: string;
  userId: string;
  title: string | null;
  status: SessionStatus;
  threadId: string;
  createdAt: string;
  updatedAt: string;
  messages?: CrmMessage[];
  _count?: { messages: number };
}

export interface CrmMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  toolCalls: ToolCallRecord[] | null;
  resultType: ResultType | null;
  resultData: unknown | null;
  createdAt: string;
}

export interface CustomerListResultData {
  customers: Array<{
    id: string;
    fullName: string;
    city: string;
    age: number;
    avgMonthlyBalance: number;
    segment: string;
  }>;
  totalCount: number;
  appliedFilters?: Record<string, unknown>;
}

export interface ScoreCardResultData {
  totalScored: number;
  qualifiedCount: number;
  avgScore: number;
  distribution: { label: string; count: number }[];
  customers: Array<{
    customerId: string;
    fullName: string;
    totalScore: number;
    readinessLabel: string;
    qualifies: boolean;
    persona: string | null;
    recommendedProducts: Array<{ product: string; rationale: string; confidence: number }>;
    scoreExplanation: string | null;
    llmAdjustment: number | null;
  }>;
}

export interface RecommendationCardResultData {
  totalCustomers: number;
  productBreakdown: { product: string; count: number }[];
}

export interface MessageCardResultData {
  messages: Array<{
    resultId: string;
    customerId: string;
    fullName: string;
    phone: string;
    messageEn: string;
    messageHi: string;
  }>;
}

export interface SpendingAnalyticsCardResultData {
  insights: Array<{
    customerId: string;
    fullName: string;
    summary: string;
    keyCategories: string[];
    riskFlags: string[];
    opportunities: string[];
  }>;
}
