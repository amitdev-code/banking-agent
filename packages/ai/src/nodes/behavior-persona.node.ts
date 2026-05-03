import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { CustomerPersona, CustomerPersonaResult, TransactionSummary } from '@banking-crm/types';

import type { CrmState } from '../graph/state';

interface BehaviorPersonaDeps {
  openaiApiKey: string;
  emitStep: (runId: string, step: string, status: string, detail?: string, progress?: { current: number; total: number }) => void;
}

const BATCH_SIZE = 10;
// Maximum concurrent LLM calls — keeps us under OpenAI rate limits while still
// being much faster than sequential execution (50 batches × ~3s → ~6s with 10 parallel)
const MAX_CONCURRENCY = 10;

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
    .reduce((sum, c) => sum + c.total, 0);
  const investmentPct = totalDebit > 0 ? (investmentTotal / totalDebit) * 100 : 0;

  const emiTotal = summary.categoryTotals
    .filter((c) => c.category === 'EMI' && c.type === 'DEBIT')
    .reduce((sum, c) => sum + c.total, 0);
  const emiBurdenPct = totalCredit > 0 ? (emiTotal / totalCredit) * 100 : 0;

  const presentSalaryMonths = summary.monthlySalaryCredits.filter((v) => v > 0).length;
  const salaryValues = summary.monthlySalaryCredits.filter((v) => v > 0);
  const salaryStdDev =
    salaryValues.length > 1
      ? Math.sqrt(
          salaryValues.reduce((sum, v) => {
            const avg = salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length;
            return sum + Math.pow(v - avg, 2);
          }, 0) / salaryValues.length,
        )
      : 0;
  const avgSalary = salaryValues.length > 0
    ? salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length
    : 0;
  const incomeVariability = avgSalary > 0 ? (salaryStdDev / avgSalary) * 100 : 0;

  const diverseCategories = new Set(
    summary.categoryTotals
      .filter((c) => c.type === 'DEBIT' && !['EMI', 'ATM_WITHDRAWAL', 'TRANSFER', 'OTHER'].includes(c.category))
      .map((c) => c.category),
  ).size;

  return [
    `customerId: ${customerId}`,
    `savingsRate: ${savingsRate.toFixed(1)}%`,
    `investmentSpend: ${investmentPct.toFixed(1)}% of outflow`,
    `emiBurden: ${emiBurdenPct.toFixed(1)}% of income`,
    `salaryMonths: ${presentSalaryMonths}/12`,
    `incomeVariability: ${incomeVariability.toFixed(1)}% (CV)`,
    `spendDiversity: ${diverseCategories} categories`,
  ].join(', ');
}

async function classifyBatch(
  model: ReturnType<InstanceType<typeof ChatOpenAI>['withStructuredOutput']>,
  profiles: string[],
): Promise<CustomerPersonaResult[]> {
  const result = (await model.invoke([
    {
      role: 'system',
      content:
        'You are a banking analyst classifying customer financial behavior personas. ' +
        'For each customer profile, assign exactly one persona:\n' +
        '- Saver: high savings rate (>30%), low lifestyle spend\n' +
        '- Spender: low savings rate (<10%), high lifestyle/shopping spend\n' +
        '- Investor: notable investment transactions (>5% of outflow)\n' +
        '- IrregularIncome: income variability >40% CV or fewer than 6 salary months\n' +
        '- Balanced: none of the above extremes — steady income, moderate saving\n' +
        'Return results for ALL provided customer IDs.',
    },
    {
      role: 'user',
      content: `Classify these ${profiles.length} customers:\n\n${profiles.join('\n')}`,
    },
  ])) as z.infer<typeof personaSchema>;
  return result.results.map((r) => ({ customerId: r.customerId, persona: r.persona as CustomerPersona }));
}

export function createBehaviorPersonaNode(deps: BehaviorPersonaDeps) {
  return async function behaviorPersonaNode(state: CrmState): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'behaviorPersona', 'running');

    if (state.transactionSummaries.length === 0) {
      deps.emitStep(state.runId, 'behaviorPersona', 'done', 'No transaction data');
      return { customerPersonas: [] };
    }

    const model = new ChatOpenAI({
      apiKey: deps.openaiApiKey,
      model: 'gpt-4o-mini',
      temperature: 0,
    }).withStructuredOutput(personaSchema);

    const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));

    // Build one profiles array per batch
    const customerIds = state.customers.map((c) => c.id);
    const batches: string[][] = [];
    for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
      const profiles = customerIds
        .slice(i, i + BATCH_SIZE)
        .map((id) => {
          const summary = summaryMap.get(id);
          return summary ? buildProfileSummary(id, summary) : null;
        })
        .filter(Boolean) as string[];
      if (profiles.length > 0) batches.push(profiles);
    }

    // Run batches in parallel, capped at MAX_CONCURRENCY to avoid rate-limit errors.
    // Sequential: 50 batches × ~3 s = ~150 s. Parallel(10): ~15 s.
    const allPersonas: CustomerPersonaResult[] = [];
    for (let i = 0; i < batches.length; i += MAX_CONCURRENCY) {
      const window = batches.slice(i, i + MAX_CONCURRENCY);
      const batchEnd = Math.min(i + MAX_CONCURRENCY, batches.length);
      deps.emitStep(state.runId, 'behaviorPersona', 'running', `Processing batch ${i + 1}–${batchEnd} of ${batches.length}`);
      const results = await Promise.all(window.map((profiles) => classifyBatch(model, profiles)));
      for (const batchResult of results) allPersonas.push(...batchResult);
    }

    deps.emitStep(state.runId, 'behaviorPersona', 'done', `${allPersonas.length} personas classified`);
    return { customerPersonas: allPersonas };
  };
}
