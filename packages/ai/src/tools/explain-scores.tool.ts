import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { ScoredCustomer, TransactionSummary } from '@banking-crm/types';

import type { CrmSessionState } from '../graph/state';
import type { ToolResult, EmitTool } from './index';

const explainSchema = z.object({
  results: z.array(z.object({ customerId: z.string(), explanation: z.string() })),
});

function buildExplainerInput(
  scored: ScoredCustomer,
  summary: TransactionSummary,
  persona: string | undefined,
): string {
  const salaryValues = summary.monthlySalaryCredits.filter((v) => v > 0);
  const avgSalary =
    salaryValues.length > 0
      ? Math.round(salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length)
      : 0;
  const topSpend = summary.categoryTotals
    .filter(
      (c) => c.type === 'DEBIT' && !['EMI', 'ATM_WITHDRAWAL', 'TRANSFER'].includes(c.category),
    )
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((c) => c.category)
    .join(', ');
  return [
    `customerId: ${scored.customerId}`,
    `score: ${scored.totalScore}/100 | label: ${scored.readinessLabel} | qualifies: ${scored.qualifies}`,
    `conversionProbability: ${Math.round(scored.conversionProbability * 100)}%`,
    `breakdown: salary=${scored.breakdown.salary}, balance=${scored.breakdown.balance}, salaryCredited=${scored.breakdown.salaryCredited}`,
    scored.loanPenalty > 0 ? `loanPenalty: -${scored.loanPenalty}` : null,
    scored.llmAdjustment
      ? `aiAdjustment: ${scored.llmAdjustment > 0 ? '+' : ''}${scored.llmAdjustment} (${scored.llmAdjustReason})`
      : null,
    `avgSalary: ₹${avgSalary.toLocaleString('en-IN')}/month | salaryMonths: ${salaryValues.length}/12`,
    `avgBalance: ₹${Math.round(summary.avgMonthlyBalance).toLocaleString('en-IN')}`,
    `topSpendCategories: ${topSpend || 'N/A'}`,
    persona ? `behaviorPersona: ${persona}` : null,
    scored.recommendedProducts.length > 0
      ? `recommendedProducts: ${scored.recommendedProducts.map((r) => r.product).join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function runExplainScores(
  _input: Record<string, never>,
  state: CrmSessionState,
  deps: { openaiApiKey: string; emitTool: EmitTool },
): Promise<ToolResult> {
  const qualified = state.scoredCustomers.filter((s) => s.qualifies);
  if (qualified.length === 0) {
    return {
      summary: 'No qualified customers to explain. Run analyze_customers first.',
      stateUpdate: {},
    };
  }

  deps.emitTool(
    state.sessionId,
    'explain_scores',
    'start',
    `Generating explanations for ${qualified.length} customers`,
  );

  const model = new ChatOpenAI({
    apiKey: deps.openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0.2,
  }).withStructuredOutput(explainSchema);
  const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));
  const personaMap = new Map(state.customerPersonas.map((p) => [p.customerId, p.persona]));
  const explanationMap = new Map<string, string>();
  const BATCH = 10;

  for (let i = 0; i < qualified.length; i += BATCH) {
    const batch = qualified.slice(i, i + BATCH);
    const inputs = batch
      .map((s) => {
        const summary = summaryMap.get(s.customerId);
        return summary ? buildExplainerInput(s, summary, personaMap.get(s.customerId)) : null;
      })
      .filter(Boolean) as string[];
    if (inputs.length === 0) continue;
    const result = await model.invoke([
      {
        role: 'system',
        content:
          'You are a banking CRM analyst writing concise score explanations for relationship managers. For each customer, write 2-3 sentences explaining what drove their score, any AI adjustment, and the primary product opportunity. Use ₹ for amounts. Do NOT include PII. Return results for ALL provided IDs.',
      },
      {
        role: 'user',
        content: `Generate score explanations for ${inputs.length} customers:\n\n${inputs.join('\n\n---\n\n')}`,
      },
    ]);
    for (const r of result.results) explanationMap.set(r.customerId, r.explanation);
  }

  const scoredCustomers = state.scoredCustomers.map((s) => {
    const explanation = explanationMap.get(s.customerId);
    const persona = personaMap.get(s.customerId);
    return {
      ...s,
      ...(explanation ? { scoreExplanation: explanation } : {}),
      ...(persona ? { persona } : {}),
    };
  });

  return {
    summary: `Generated explanations for ${explanationMap.size} qualified customers`,
    stateUpdate: { scoredCustomers },
  };
}
