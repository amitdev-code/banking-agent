import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';

import type { PrismaClient } from '@banking-crm/database';

import type { CrmSessionState } from '../graph/state';
import { runFetchCustomers, fetchCustomersInputSchema } from './fetch-customers.tool';
import { runFetchTransactions } from './fetch-transactions.tool';
import { runAnalyzeCustomers } from './analyze-customers.tool';
import { runAnalyzeSpending } from './analyze-spending.tool';
import { runExplainScores } from './explain-scores.tool';
import { runRecommendProducts } from './recommend-products.tool';
import { runGenerateMessages } from './generate-messages.tool';

export type EmitTool = (
  sessionId: string,
  tool: string,
  status: 'start' | 'done' | 'error',
  detail?: string,
  durationMs?: number,
) => void;

export interface ToolResult {
  summary: string;
  stateUpdate: Partial<CrmSessionState>;
  resultType?:
    | 'customer_list'
    | 'score_card'
    | 'recommendation_card'
    | 'message_card'
    | 'spending_analytics_card';
  resultData?: unknown;
}

export interface AgentToolDeps {
  prisma: PrismaClient;
  openaiApiKey: string;
  emitTool: EmitTool;
}

// ─── LLM Tool Definitions (DynamicStructuredTool for proper schema binding) ───
// These have dummy funcs — actual execution is in dispatchTool below.

export function createLlmTools(): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: 'fetch_customers',
      description:
        'Fetch customers from the database based on natural language criteria or structured filters. ' +
        'Use this when the user asks to find, get, fetch, or list customers with specific characteristics.',
      schema: fetchCustomersInputSchema,
      func: async () => 'dispatched',
    }),
    new DynamicStructuredTool({
      name: 'fetch_transactions',
      description:
        'Load and aggregate 12-month transaction history for the currently loaded customers. ' +
        'Must be called before analyze_customers. No input needed — automatically uses loaded customers.',
      schema: z.object({}),
      func: async () => 'dispatched',
    }),
    new DynamicStructuredTool({
      name: 'analyze_customers',
      description:
        'Run behavioral persona classification + scoring + AI score adjustment on loaded customers. ' +
        'Requires transactions to be loaded first. Returns score distribution and qualifying customers.',
      schema: z.object({
        customerIds: z
          .array(z.string())
          .optional()
          .describe('Optional subset of customer IDs to analyze. Omit to analyze all.'),
      }),
      func: async () => 'dispatched',
    }),
    new DynamicStructuredTool({
      name: 'analyze_spending',
      description:
        'Run LLM-based spending analytics on loaded transaction summaries. ' +
        'Use this when user asks for spending behavior insights, category analysis, or customer-level spend diagnostics.',
      schema: z.object({
        customerIds: z
          .array(z.string())
          .optional()
          .describe('Optional subset of customer IDs to analyze spending for.'),
      }),
      func: async () => 'dispatched',
    }),
    new DynamicStructuredTool({
      name: 'explain_scores',
      description:
        "Generate human-readable AI explanations for each qualified customer's score. " +
        'Run after analyze_customers to give relationship managers insight into scoring rationale.',
      schema: z.object({}),
      func: async () => 'dispatched',
    }),
    new DynamicStructuredTool({
      name: 'recommend_products',
      description:
        'Match banking products (Personal Loan, Home Loan, Credit Card) to qualified customers. ' +
        'Run after analyze_customers.',
      schema: z.object({}),
      func: async () => 'dispatched',
    }),
    new DynamicStructuredTool({
      name: 'generate_messages',
      description:
        'Generate personalized WhatsApp outreach messages in English and Hindi for qualified customers. ' +
        'Optionally target specific customer IDs. ' +
        'Only call when the user explicitly asks to generate or send messages.',
      schema: z.object({
        customerIds: z
          .array(z.string())
          .optional()
          .describe('Optional subset of customer IDs to generate messages for.'),
      }),
      func: async () => 'dispatched',
    }),
  ];
}

// ─── Tool Dispatcher ──────────────────────────────────────────────────────────

export async function dispatchTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  state: CrmSessionState,
  deps: AgentToolDeps,
): Promise<ToolResult> {
  switch (toolName) {
    case 'fetch_customers':
      return runFetchCustomers(toolInput as Parameters<typeof runFetchCustomers>[0], state, deps);
    case 'fetch_transactions':
      return runFetchTransactions({} as never, state, deps);
    case 'analyze_customers':
      return runAnalyzeCustomers(toolInput as { customerIds?: string[] }, state, deps);
    case 'analyze_spending':
      return runAnalyzeSpending(toolInput as { customerIds?: string[] }, state, deps);
    case 'explain_scores':
      return runExplainScores({} as never, state, deps);
    case 'recommend_products':
      return runRecommendProducts({} as never, state, deps);
    case 'generate_messages':
      return runGenerateMessages(toolInput as { customerIds?: string[] }, state, deps);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
