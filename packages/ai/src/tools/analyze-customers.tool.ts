import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type {
  CustomerPersona,
  CustomerPersonaResult,
  ScoredCustomer,
  TransactionSummary,
} from '@banking-crm/types';

import { resolveReadinessLabel, scoreCustomer } from '../scoring/engine';
import { sigmoidProbability } from '../scoring/sigmoid';
import type { CrmSessionState } from '../graph/state';
import type { ToolResult, EmitTool } from './index';

// ─── Persona classification (mirrors behavior-persona.node.ts logic) ──────────

const personaSchema = z.object({
  results: z.array(
    z.object({
      customerId: z.string(),
      persona: z.enum(['Saver', 'Spender', 'Investor', 'IrregularIncome', 'Balanced']),
    }),
  ),
});

function buildProfileSummary(customerId: string, summary: TransactionSummary): string {
  const totalCredit = summary.totalCreditLast12Months;
  const totalDebit = summary.totalDebitLast12Months;
  const savingsRate = totalCredit > 0 ? ((totalCredit - totalDebit) / totalCredit) * 100 : 0;
  const investmentTotal = summary.categoryTotals
    .filter((c) => c.category === 'INVESTMENT' && c.type === 'DEBIT')
    .reduce((s, c) => s + c.total, 0);
  const investmentPct = totalDebit > 0 ? (investmentTotal / totalDebit) * 100 : 0;
  const emiTotal = summary.categoryTotals
    .filter((c) => c.category === 'EMI' && c.type === 'DEBIT')
    .reduce((s, c) => s + c.total, 0);
  const emiBurdenPct = totalCredit > 0 ? (emiTotal / totalCredit) * 100 : 0;
  const salaryValues = summary.monthlySalaryCredits.filter((v) => v > 0);
  const avgSalary =
    salaryValues.length > 0 ? salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length : 0;
  const salaryStdDev =
    salaryValues.length > 1
      ? Math.sqrt(
          salaryValues.reduce((sum, v) => sum + Math.pow(v - avgSalary, 2), 0) /
            salaryValues.length,
        )
      : 0;
  const incomeVariability = avgSalary > 0 ? (salaryStdDev / avgSalary) * 100 : 0;
  const diverseCategories = new Set(
    summary.categoryTotals
      .filter(
        (c) =>
          c.type === 'DEBIT' &&
          !['EMI', 'ATM_WITHDRAWAL', 'TRANSFER', 'OTHER'].includes(c.category),
      )
      .map((c) => c.category),
  ).size;
  return [
    `customerId: ${customerId}`,
    `savingsRate: ${savingsRate.toFixed(1)}%`,
    `investmentSpend: ${investmentPct.toFixed(1)}% of outflow`,
    `emiBurden: ${emiBurdenPct.toFixed(1)}% of income`,
    `salaryMonths: ${salaryValues.length}/12`,
    `incomeVariability: ${incomeVariability.toFixed(1)}% (CV)`,
    `spendDiversity: ${diverseCategories} categories`,
  ].join(', ');
}

async function classifyPersonas(
  customerIds: string[],
  summaryMap: Map<string, TransactionSummary>,
  apiKey: string,
): Promise<CustomerPersonaResult[]> {
  const model = new ChatOpenAI({
    apiKey,
    model: 'gpt-4o-mini',
    temperature: 0,
  }).withStructuredOutput(personaSchema);
  const BATCH = 10;
  const MAX_CONCURRENCY = 10;
  const batches: string[][] = [];
  for (let i = 0; i < customerIds.length; i += BATCH) {
    const profiles = customerIds
      .slice(i, i + BATCH)
      .map((id) => {
        const s = summaryMap.get(id);
        return s ? buildProfileSummary(id, s) : null;
      })
      .filter(Boolean) as string[];
    if (profiles.length > 0) batches.push(profiles);
  }
  const all: CustomerPersonaResult[] = [];
  for (let i = 0; i < batches.length; i += MAX_CONCURRENCY) {
    const results = await Promise.all(
      batches.slice(i, i + MAX_CONCURRENCY).map(
        (profiles) =>
          model.invoke([
            {
              role: 'system',
              content:
                "Classify each customer's financial behavior persona. Options: Saver (high savings >30%), Spender (low savings <10%, high lifestyle), Investor (>5% investment spend), IrregularIncome (<6 salary months or >40% income variability), Balanced (none of the extremes). Return results for ALL provided IDs.",
            },
            {
              role: 'user',
              content: `Classify ${profiles.length} customers:\n\n${profiles.join('\n')}`,
            },
          ]) as Promise<z.infer<typeof personaSchema>>,
      ),
    );
    for (const r of results)
      all.push(
        ...r.results.map((x) => ({
          customerId: x.customerId,
          persona: x.persona as CustomerPersona,
        })),
      );
  }
  return all;
}

// ─── LLM Score Adjustment (mirrors llm-score-adjust.node.ts logic) ────────────

const adjustSchema = z.object({
  results: z.array(
    z.object({
      customerId: z.string(),
      adjustment: z.number().int().min(-20).max(20),
      reasoning: z.string(),
    }),
  ),
});

async function adjustScores(
  scored: ScoredCustomer[],
  summaryMap: Map<string, TransactionSummary>,
  scoringConfig: CrmSessionState['scoringConfig'],
  apiKey: string,
): Promise<ScoredCustomer[]> {
  const { llmHybrid, readinessLabels, sigmoid, qualifyThreshold } = scoringConfig;
  if (!llmHybrid.enabled) return scored;
  const borderline = scored.filter(
    (s) => s.totalScore >= llmHybrid.borderlineMin && s.totalScore <= llmHybrid.borderlineMax,
  );
  if (borderline.length === 0) return scored;

  const model = new ChatOpenAI({
    apiKey,
    model: 'gpt-4o-mini',
    temperature: 0,
  }).withStructuredOutput(adjustSchema);
  const adjustmentMap = new Map<string, { adjustment: number; reasoning: string }>();
  const BATCH = 8;

  for (let i = 0; i < borderline.length; i += BATCH) {
    const batch = borderline.slice(i, i + BATCH);
    const narratives = batch
      .map((s) => {
        const summary = summaryMap.get(s.customerId);
        if (!summary) return null;
        const salaryValues = summary.monthlySalaryCredits.filter((v) => v > 0);
        const avgSalary =
          salaryValues.length > 0
            ? salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length
            : 0;
        const recentAvg =
          summary.monthlySalaryCredits
            .slice(-2)
            .filter((v) => v > 0)
            .reduce((a, b) => a + b, 0) /
          Math.max(1, summary.monthlySalaryCredits.slice(-2).filter((v) => v > 0).length);
        const hasSalaryJump = recentAvg > avgSalary * 1.3 && avgSalary > 0;
        const salaryTotal = salaryValues.reduce((a, b) => a + b, 0);
        const nonSalaryCredit = summary.totalCreditLast12Months - salaryTotal;
        const hasLargeIrregularCredit = nonSalaryCredit > salaryTotal * 0.5;
        const emiTotal = summary.categoryTotals
          .filter((c) => c.category === 'EMI' && c.type === 'DEBIT')
          .reduce((sum, c) => sum + c.total, 0);
        const emiBurdenPct =
          summary.totalCreditLast12Months > 0
            ? ((emiTotal / summary.totalCreditLast12Months) * 100).toFixed(1)
            : '0';
        return [
          `customerId: ${s.customerId}`,
          `ruleScore: ${s.totalScore}/100 (${s.readinessLabel})`,
          `breakdown: salary=${s.breakdown.salary}, balance=${s.breakdown.balance}, salaryCredited=${s.breakdown.salaryCredited}`,
          `loanPenalty: ${s.loanPenalty}`,
          `avgSalary: ₹${Math.round(avgSalary).toLocaleString('en-IN')}`,
          `emiBurden: ${emiBurdenPct}% of income`,
          hasSalaryJump ? `⚠ RECENT SALARY JUMP` : null,
          hasLargeIrregularCredit ? `⚠ LARGE NON-SALARY CREDIT` : null,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .filter(Boolean) as string[];
    if (narratives.length === 0) continue;
    const result = await model.invoke([
      {
        role: 'system',
        content: `You are a senior credit analyst reviewing borderline loan applicants scored ${llmHybrid.borderlineMin}–${llmHybrid.borderlineMax}/100. Adjust scores ±${llmHybrid.maxAdjustment} pts max based on qualitative signals. Return 0 if no clear signal.`,
      },
      {
        role: 'user',
        content: `Review these ${narratives.length} borderline customers:\n\n${narratives.join('\n\n---\n\n')}`,
      },
    ]);
    for (const r of result.results) {
      const clamped = Math.max(
        -llmHybrid.maxAdjustment,
        Math.min(llmHybrid.maxAdjustment, r.adjustment),
      );
      adjustmentMap.set(r.customerId, { adjustment: clamped, reasoning: r.reasoning });
    }
  }

  return scored.map((s) => {
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
}

export async function runAnalyzeCustomers(
  input: { customerIds?: string[] },
  state: CrmSessionState,
  deps: { openaiApiKey: string; emitTool: EmitTool },
): Promise<ToolResult> {
  if (state.customers.length === 0) {
    return { summary: 'No customers loaded. Fetch customers first.', stateUpdate: {} };
  }
  if (state.transactionSummaries.length === 0) {
    return { summary: 'Transactions not loaded. Run fetch_transactions first.', stateUpdate: {} };
  }

  const customersToScore = input.customerIds
    ? state.customers.filter((c) => input.customerIds!.includes(c.id))
    : state.customers;

  deps.emitTool(
    state.sessionId,
    'analyze_customers',
    'start',
    `Analyzing ${customersToScore.length} customers`,
  );

  const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));

  // Step 1: Persona classification
  const personas = await classifyPersonas(
    customersToScore.map((c) => c.id),
    summaryMap,
    deps.openaiApiKey,
  );
  const personaMap = new Map(personas.map((p) => [p.customerId, p.persona]));

  // Step 2: Rule-based scoring
  let scoredCustomers: ScoredCustomer[] = customersToScore.map((customer) => {
    const summary = summaryMap.get(customer.id);
    if (!summary)
      return {
        customerId: customer.id,
        totalScore: 0,
        breakdown: {
          salary: 0,
          balance: 0,
          spending: 0,
          salaryCredited: 0,
          products: 0,
          age: 0,
          activity: 0,
        },
        readinessLabel: 'At-Risk' as const,
        conversionProbability: 0,
        recommendedProducts: [],
        hasExistingLoan: customer.hasActiveLoan,
        loanPenalty: 0,
        qualifies: false,
        disqualifiedReason: 'no_transaction_data',
      };
    const scored = scoreCustomer(customer, summary, state.scoringConfig);
    const persona = personaMap.get(customer.id);
    return persona ? { ...scored, persona } : scored;
  });

  // Step 3: LLM score adjustment
  scoredCustomers = await adjustScores(
    scoredCustomers,
    summaryMap,
    state.scoringConfig,
    deps.openaiApiKey,
  );

  const qualified = scoredCustomers.filter((s) => s.qualifies).length;
  const avg = Math.round(
    scoredCustomers.reduce((s, c) => s + c.totalScore, 0) / Math.max(1, scoredCustomers.length),
  );

  const distribution = [
    { label: 'Primed (80+)', count: scoredCustomers.filter((s) => s.totalScore >= 80).length },
    {
      label: 'Engaged (60–79)',
      count: scoredCustomers.filter((s) => s.totalScore >= 60 && s.totalScore < 80).length,
    },
    {
      label: 'Dormant (40–59)',
      count: scoredCustomers.filter((s) => s.totalScore >= 40 && s.totalScore < 60).length,
    },
    { label: 'At-Risk (<40)', count: scoredCustomers.filter((s) => s.totalScore < 40).length },
  ];

  return {
    summary: `Analyzed ${scoredCustomers.length} customers — ${qualified} qualified (avg score: ${avg})`,
    stateUpdate: { scoredCustomers, customerPersonas: personas },
    resultType: 'score_card',
    resultData: {
      totalScored: scoredCustomers.length,
      qualifiedCount: qualified,
      avgScore: avg,
      distribution,
      customers: scoredCustomers.slice(0, 50).map((s) => ({
        customerId: s.customerId,
        fullName: state.customers.find((c) => c.id === s.customerId)?.fullName ?? '',
        totalScore: s.totalScore,
        readinessLabel: s.readinessLabel,
        qualifies: s.qualifies,
        persona: s.persona ?? null,
        recommendedProducts: s.recommendedProducts,
        scoreExplanation: s.scoreExplanation ?? null,
        llmAdjustment: s.llmAdjustment ?? null,
      })),
    },
  };
}
