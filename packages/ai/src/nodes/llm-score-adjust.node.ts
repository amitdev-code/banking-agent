import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { ScoredCustomer, TransactionSummary } from '@banking-crm/types';

import { resolveReadinessLabel } from '../scoring/engine';
import { sigmoidProbability } from '../scoring/sigmoid';
import type { CrmState } from '../graph/state';

interface LlmScoreAdjustDeps {
  openaiApiKey: string;
  emitStep: (runId: string, step: string, status: string, detail?: string, progress?: { current: number; total: number }) => void;
}

const adjustSchema = z.object({
  results: z.array(
    z.object({
      customerId: z.string(),
      adjustment: z.number().int().min(-20).max(20),
      reasoning: z.string(),
    }),
  ),
});

function buildNarrative(scored: ScoredCustomer, summary: TransactionSummary): string {
  const salaryValues = summary.monthlySalaryCredits.filter((v) => v > 0);
  const avgSalary = salaryValues.length > 0
    ? salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length
    : 0;

  // Detect recent salary jump: last 2 months vs prior average
  const recentSalary = summary.monthlySalaryCredits.slice(-2).filter((v) => v > 0);
  const recentAvg = recentSalary.length > 0
    ? recentSalary.reduce((a, b) => a + b, 0) / recentSalary.length
    : 0;
  const hasSalaryJump = recentAvg > avgSalary * 1.3 && avgSalary > 0;

  // Detect large irregular credits (freelance/business pattern)
  const totalCredit = summary.totalCreditLast12Months;
  const salaryTotal = salaryValues.reduce((a, b) => a + b, 0);
  const nonSalaryCredit = totalCredit - salaryTotal;
  const hasLargeIrregularCredit = nonSalaryCredit > salaryTotal * 0.5;

  const emiTotal = summary.categoryTotals
    .filter((c) => c.category === 'EMI' && c.type === 'DEBIT')
    .reduce((sum, c) => sum + c.total, 0);
  const emiBurdenPct = totalCredit > 0 ? ((emiTotal / totalCredit) * 100).toFixed(1) : '0';

  const lines = [
    `customerId: ${scored.customerId}`,
    `ruleScore: ${scored.totalScore}/100 (${scored.readinessLabel})`,
    `breakdown: salary=${scored.breakdown.salary}, balance=${scored.breakdown.balance}, ` +
      `salaryCredited=${scored.breakdown.salaryCredited}, spending=${scored.breakdown.spending}, ` +
      `age=${scored.breakdown.age}, activity=${scored.breakdown.activity}, products=${scored.breakdown.products}`,
    `loanPenalty: ${scored.loanPenalty} (hasLoan: ${scored.hasExistingLoan})`,
    `avgMonthlySalary: ₹${Math.round(avgSalary).toLocaleString('en-IN')}`,
    `salaryMonths: ${summary.monthlySalaryCredits.filter((v) => v > 0).length}/12`,
    `emiBurden: ${emiBurdenPct}% of income`,
    `avgBalance: ₹${Math.round(summary.avgMonthlyBalance).toLocaleString('en-IN')}`,
    hasSalaryJump ? `⚠ RECENT SALARY JUMP: recent avg ₹${Math.round(recentAvg).toLocaleString('en-IN')} vs prior ₹${Math.round(avgSalary).toLocaleString('en-IN')}` : null,
    hasLargeIrregularCredit ? `⚠ LARGE NON-SALARY CREDIT: ₹${Math.round(nonSalaryCredit).toLocaleString('en-IN')} beyond salary (possible freelance/business income)` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

export function createLlmScoreAdjustNode(deps: LlmScoreAdjustDeps) {
  return async function llmScoreAdjustNode(state: CrmState): Promise<Partial<CrmState>> {
    const { llmHybrid, readinessLabels, sigmoid, qualifyThreshold } = state.scoringConfig;

    if (!llmHybrid.enabled) {
      deps.emitStep(state.runId, 'llmScoreAdjust', 'done', 'LLM hybrid disabled');
      return {};
    }

    const borderline = state.scoredCustomers.filter(
      (s) => s.totalScore >= llmHybrid.borderlineMin && s.totalScore <= llmHybrid.borderlineMax,
    );

    if (borderline.length === 0) {
      deps.emitStep(state.runId, 'llmScoreAdjust', 'done', 'No borderline customers');
      return {};
    }

    deps.emitStep(state.runId, 'llmScoreAdjust', 'running', `${borderline.length} borderline customers`);

    const model = new ChatOpenAI({
      apiKey: deps.openaiApiKey,
      model: 'gpt-4o-mini',
      temperature: 0,
    }).withStructuredOutput(adjustSchema);

    const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));
    const adjustmentMap = new Map<string, { adjustment: number; reasoning: string }>();

    const BATCH = 8;
    const totalBatches = Math.ceil(borderline.length / BATCH);
    for (let i = 0; i < borderline.length; i += BATCH) {
      const batchNum = Math.floor(i / BATCH) + 1;
      deps.emitStep(state.runId, 'llmScoreAdjust', 'running', `Reviewing batch ${batchNum}/${totalBatches}`);
      const batch = borderline.slice(i, i + BATCH);
      const narratives = batch
        .map((s) => {
          const summary = summaryMap.get(s.customerId);
          return summary ? buildNarrative(s, summary) : null;
        })
        .filter(Boolean) as string[];

      if (narratives.length === 0) continue;

      const result = await model.invoke([
        {
          role: 'system',
          content:
            'You are a senior credit analyst reviewing borderline loan applicants that a rule-based system scored between ' +
            `${llmHybrid.borderlineMin} and ${llmHybrid.borderlineMax}/100. ` +
            'Your job is to ADJUST the score up or down based on qualitative signals the rules may have missed.\n\n' +
            'Reasons to INCREASE score (+):\n' +
            '- Recent salary jump indicates career growth\n' +
            '- Large irregular credits suggest additional income beyond salary (freelance, business)\n' +
            '- Very high average balance compensates for income inconsistency\n' +
            '- Consistent investment behavior signals financial maturity\n\n' +
            'Reasons to DECREASE score (-):\n' +
            '- High EMI burden (>40% of income) despite decent score\n' +
            '- Balance is high but salary is irregular (inherited/gifted funds)\n' +
            '- Very low transaction activity despite high balance\n\n' +
            `Max adjustment: ±${llmHybrid.maxAdjustment} points. Return 0 if no clear signal.\n` +
            'Be concise in reasoning (1-2 sentences). Return results for ALL provided customer IDs.',
        },
        {
          role: 'user',
          content: `Review these ${narratives.length} borderline customers:\n\n${narratives.join('\n\n---\n\n')}`,
        },
      ]);

      for (const r of result.results) {
        const clamped = Math.max(-llmHybrid.maxAdjustment, Math.min(llmHybrid.maxAdjustment, r.adjustment));
        adjustmentMap.set(r.customerId, { adjustment: clamped, reasoning: r.reasoning });
      }
    }

    // Apply adjustments
    const updatedCustomers = state.scoredCustomers.map((s) => {
      const adj = adjustmentMap.get(s.customerId);
      if (!adj || adj.adjustment === 0) return s;

      const newScore = Math.max(0, Math.min(100, s.totalScore + adj.adjustment));
      return {
        ...s,
        totalScore: newScore,
        readinessLabel: resolveReadinessLabel(newScore, readinessLabels),
        conversionProbability: sigmoidProbability(newScore, sigmoid.midpoint, sigmoid.steepness),
        qualifies: newScore >= qualifyThreshold,
        llmAdjustment: adj.adjustment,
        llmAdjustReason: adj.reasoning,
      };
    });

    const adjustedCount = [...adjustmentMap.values()].filter((a) => a.adjustment !== 0).length;
    deps.emitStep(state.runId, 'llmScoreAdjust', 'done', `${adjustedCount} scores adjusted`);
    return { scoredCustomers: updatedCustomers };
  };
}
