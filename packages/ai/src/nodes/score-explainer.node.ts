import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { ScoredCustomer, TransactionSummary } from '@banking-crm/types';

import type { CrmState } from '../graph/state';

interface ScoreExplainerDeps {
  openaiApiKey: string;
  emitStep: (runId: string, step: string, status: string, detail?: string, progress?: { current: number; total: number }) => void;
}

const BATCH_SIZE = 10;

const explainSchema = z.object({
  results: z.array(
    z.object({
      customerId: z.string(),
      explanation: z.string(),
    }),
  ),
});

function buildExplainerInput(
  scored: ScoredCustomer,
  summary: TransactionSummary,
  persona: string | undefined,
): string {
  const salaryValues = summary.monthlySalaryCredits.filter((v) => v > 0);
  const avgSalary = salaryValues.length > 0
    ? Math.round(salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length)
    : 0;

  const topSpend = summary.categoryTotals
    .filter((c) => c.type === 'DEBIT' && !['EMI', 'ATM_WITHDRAWAL', 'TRANSFER'].includes(c.category))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((c) => `${c.category}`)
    .join(', ');

  const lines = [
    `customerId: ${scored.customerId}`,
    `score: ${scored.totalScore}/100 | label: ${scored.readinessLabel} | qualifies: ${scored.qualifies}`,
    `conversionProbability: ${Math.round(scored.conversionProbability * 100)}%`,
    `breakdown: salary=${scored.breakdown.salary}, balance=${scored.breakdown.balance}, ` +
      `salaryCredited=${scored.breakdown.salaryCredited}, spending=${scored.breakdown.spending}, ` +
      `products=${scored.breakdown.products}, age=${scored.breakdown.age}, activity=${scored.breakdown.activity}`,
    scored.loanPenalty > 0 ? `loanPenalty: -${scored.loanPenalty} (${summary.loanType} loan)` : null,
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
  ].filter(Boolean);

  return lines.join('\n');
}

export function createScoreExplainerNode(deps: ScoreExplainerDeps) {
  return async function scoreExplainerNode(state: CrmState): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'scoreExplainer', 'running');

    const qualified = state.scoredCustomers.filter((s) => s.qualifies);

    if (qualified.length === 0) {
      deps.emitStep(state.runId, 'scoreExplainer', 'done', 'No qualifying customers to explain');
      return {};
    }

    const model = new ChatOpenAI({
      apiKey: deps.openaiApiKey,
      model: 'gpt-4o-mini',
      temperature: 0.2,
    }).withStructuredOutput(explainSchema);

    const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));
    const personaMap = new Map(state.customerPersonas.map((p) => [p.customerId, p.persona]));
    const explanationMap = new Map<string, string>();

    const totalBatches = Math.ceil(qualified.length / BATCH_SIZE);
    for (let i = 0; i < qualified.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      deps.emitStep(state.runId, 'scoreExplainer', 'running', `Explaining batch ${batchNum}/${totalBatches}`);
      const batch = qualified.slice(i, i + BATCH_SIZE);
      const inputs = batch
        .map((s) => {
          const summary = summaryMap.get(s.customerId);
          if (!summary) return null;
          const persona = personaMap.get(s.customerId);
          return buildExplainerInput(s, summary, persona);
        })
        .filter(Boolean) as string[];

      if (inputs.length === 0) continue;

      const result = await model.invoke([
        {
          role: 'system',
          content:
            'You are a banking CRM analyst writing concise score explanations for relationship managers. ' +
            'For each customer, write 2-3 sentences explaining:\n' +
            '1. What drove their score (mention specific financial strengths)\n' +
            '2. Any AI adjustment made and why (if applicable)\n' +
            '3. The primary product opportunity and why this customer is a good fit\n\n' +
            'Use ₹ for rupee amounts. Keep it factual and professional. ' +
            'Do NOT mention the customer\'s name or PII. ' +
            'Return results for ALL provided customer IDs.',
        },
        {
          role: 'user',
          content: `Generate score explanations for these ${inputs.length} customers:\n\n${inputs.join('\n\n---\n\n')}`,
        },
      ]);

      for (const r of result.results) {
        explanationMap.set(r.customerId, r.explanation);
      }
    }

    const updatedCustomers = state.scoredCustomers.map((s) => {
      const explanation = explanationMap.get(s.customerId);
      const persona = personaMap.get(s.customerId);
      return {
        ...s,
        ...(explanation ? { scoreExplanation: explanation } : {}),
        ...(persona ? { persona } : {}),
      };
    });

    deps.emitStep(state.runId, 'scoreExplainer', 'done', `${explanationMap.size} explanations generated`);
    return { scoredCustomers: updatedCustomers };
  };
}
