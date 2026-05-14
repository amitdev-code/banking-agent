import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { SpendingInsight, TransactionSummary } from '@banking-crm/types';

import type { CrmSessionState } from '../graph/state';
import type { ToolResult, EmitTool } from './index';

const insightSchema = z.object({
  summary: z.string(),
  keyCategories: z.array(z.string()).max(5),
  riskFlags: z.array(z.string()).max(4),
  opportunities: z.array(z.string()).max(4),
});

function buildFallbackInsight(summary: TransactionSummary): Omit<SpendingInsight, 'customerId'> {
  const topDebits = summary.categoryTotals
    .filter((c) => c.type === 'DEBIT')
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((c) => c.category);

  const credit = summary.totalCreditLast12Months;
  const debit = summary.totalDebitLast12Months;
  const spendRatio = credit > 0 ? debit / credit : 0;

  const riskFlags: string[] = [];
  if (spendRatio > 0.9)
    riskFlags.push('Outflow is close to inflow, indicating low monthly surplus.');
  if (summary.transactionCountLast30Days < 5) riskFlags.push('Low recent transaction activity.');

  const opportunities: string[] = [];
  if (spendRatio >= 0.5) opportunities.push('Good credit appetite signal for loan-led cross-sell.');
  if (topDebits.includes('SHOPPING') || topDebits.includes('DINING'))
    opportunities.push('Lifestyle spends indicate rewards card potential.');

  return {
    summary: `Customer shows highest debit concentration in ${topDebits.join(', ') || 'mixed categories'}. Spending-to-income ratio is ${(spendRatio * 100).toFixed(0)}%.`,
    keyCategories: topDebits,
    riskFlags,
    opportunities,
  };
}

function buildInputNarrative(
  state: CrmSessionState,
  customerId: string,
  summary: TransactionSummary,
): string {
  const scored = state.scoredCustomers.find((s) => s.customerId === customerId);
  const topDebits = summary.categoryTotals
    .filter((c) => c.type === 'DEBIT')
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((c) => `${c.category}: ₹${Math.round(c.total).toLocaleString('en-IN')}`);

  return [
    `customerId: ${customerId}`,
    `totalCreditLast12Months: ₹${Math.round(summary.totalCreditLast12Months).toLocaleString('en-IN')}`,
    `totalDebitLast12Months: ₹${Math.round(summary.totalDebitLast12Months).toLocaleString('en-IN')}`,
    `avgMonthlyBalance: ₹${Math.round(summary.avgMonthlyBalance).toLocaleString('en-IN')}`,
    `transactionCountLast30Days: ${summary.transactionCountLast30Days}`,
    `topDebitCategories: ${topDebits.join(', ') || 'none'}`,
    `recommendedProducts: ${scored?.recommendedProducts.map((p) => p.product).join(', ') || 'none'}`,
  ].join('\n');
}

export async function runAnalyzeSpending(
  input: { customerIds?: string[] },
  state: CrmSessionState,
  deps: { openaiApiKey: string; emitTool: EmitTool },
): Promise<ToolResult> {
  if (state.transactionSummaries.length === 0) {
    return { summary: 'Transactions not loaded. Run fetch_transactions first.', stateUpdate: {} };
  }

  const targetIds = input.customerIds?.length
    ? new Set(input.customerIds)
    : new Set(state.transactionSummaries.map((s) => s.customerId));

  const targetSummaries = state.transactionSummaries.filter((s) => targetIds.has(s.customerId));
  deps.emitTool(
    state.sessionId,
    'analyze_spending',
    'start',
    `Analyzing spending for ${targetSummaries.length} customers`,
  );

  const model = new ChatOpenAI({
    apiKey: deps.openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0.2,
  }).withStructuredOutput(insightSchema, { name: 'spending_insight' });

  const insights: SpendingInsight[] = [];
  for (const summary of targetSummaries) {
    const narrative = buildInputNarrative(state, summary.customerId, summary);
    try {
      const result = await model.invoke([
        {
          role: 'system',
          content:
            'You are a banking analytics assistant. Analyze customer spending behavior and produce concise business insights for relationship managers. ' +
            'Focus on spend patterns, risk indicators, and cross-sell opportunities.',
        },
        {
          role: 'user',
          content: narrative,
        },
      ]);
      insights.push({
        customerId: summary.customerId,
        summary: result.summary,
        keyCategories: result.keyCategories,
        riskFlags: result.riskFlags,
        opportunities: result.opportunities,
      });
    } catch {
      insights.push({
        customerId: summary.customerId,
        ...buildFallbackInsight(summary),
      });
    }
  }

  const existing = new Map(state.spendingInsights.map((i) => [i.customerId, i]));
  for (const insight of insights) existing.set(insight.customerId, insight);
  const mergedInsights = Array.from(existing.values());

  const customerMap = new Map(state.customers.map((c) => [c.id, c.fullName]));

  return {
    summary: `Generated spending analytics for ${insights.length} customers`,
    stateUpdate: { spendingInsights: mergedInsights },
    resultType: 'spending_analytics_card',
    resultData: {
      insights: insights.slice(0, 30).map((i) => ({
        customerId: i.customerId,
        fullName: customerMap.get(i.customerId) ?? '',
        summary: i.summary,
        keyCategories: i.keyCategories,
        riskFlags: i.riskFlags,
        opportunities: i.opportunities,
      })),
    },
  };
}
