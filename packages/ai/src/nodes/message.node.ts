import { ChatOpenAI } from '@langchain/openai';
import { interrupt } from '@langchain/langgraph';
import { z } from 'zod';

import type { GeneratedMessage, ProductType, ScoredCustomer, TransactionSummary } from '@banking-crm/types';

import { buildRagContext } from '../rag/retriever';
import type { CrmState } from '../graph/state';

interface MessageDeps {
  openaiApiKey: string;
  emitStep: (runId: string, step: string, status: string, detail?: string) => void;
  isPaused: (runId: string) => Promise<boolean>;
}

const messageSchema = z.object({
  english: z.string(),
  hindi: z.string(),
});

function buildCustomerContext(
  scored: ScoredCustomer,
  summary: TransactionSummary,
): string {
  const avgSalary =
    summary.monthlySalaryCredits.filter((v) => v > 0).reduce((a, b) => a + b, 0) /
    Math.max(1, summary.monthlySalaryCredits.filter((v) => v > 0).length);

  const topCategories = summary.categoryTotals
    .filter((c) => c.type === 'DEBIT')
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((c) => `${c.category}: ₹${Math.round(c.total / 12).toLocaleString('en-IN')}/month`)
    .join(', ');

  return [
    `Score: ${scored.totalScore}/100 (${scored.readinessLabel})`,
    `Conversion probability: ${Math.round(scored.conversionProbability * 100)}%`,
    `Average monthly salary: ₹${Math.round(avgSalary).toLocaleString('en-IN')}`,
    `Average balance: ₹${Math.round(summary.avgMonthlyBalance).toLocaleString('en-IN')}`,
    `Top spending: ${topCategories || 'N/A'}`,
    `Recommended products: ${scored.recommendedProducts.map((r) => r.product).join(', ')}`,
  ].join('\n');
}

export function createMessageNode(deps: MessageDeps) {
  return async function messageNode(
    state: CrmState,
  ): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'message', 'running');

    // Check pause before expensive LLM calls
    const paused = await deps.isPaused(state.runId);
    if (paused) {
      interrupt('Workflow paused by user before message generation');
    }

    const qualifiedCustomers = state.scoredCustomers.filter((s) => s.qualifies);

    if (qualifiedCustomers.length === 0) {
      deps.emitStep(state.runId, 'message', 'done', 'No qualifying customers');
      return { generatedMessages: [] };
    }

    const model = new ChatOpenAI({
      apiKey: deps.openaiApiKey,
      model: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const modelWithOutput = model.withStructuredOutput(messageSchema);
    const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));

    const messages: GeneratedMessage[] = [];

    for (const scored of qualifiedCustomers) {
      const summary = summaryMap.get(scored.customerId);
      if (!summary) continue;

      const products = scored.recommendedProducts.map((r) => r.product as ProductType);
      const ragContext = buildRagContext(products.length > 0 ? products : ['PERSONAL_LOAN']);
      const customerContext = buildCustomerContext(scored, summary);

      const result = await modelWithOutput.invoke([
        {
          role: 'system',
          content:
            'You are a banking relationship manager generating personalized WhatsApp messages for loan products. ' +
            'Generate a message in both English and Hindi based on the customer financial profile and product context. ' +
            'Messages must be warm, personalized, concise (under 200 words each), and end with a clear CTA. ' +
            'DO NOT include the customer\'s name, PII, or account details in the message. ' +
            'Reference their spending habits and financial strengths instead.\n\n' +
            '## Product Context\n' + ragContext,
        },
        {
          role: 'user',
          content: `Generate a WhatsApp message for this customer:\n\n${customerContext}`,
        },
      ]);

      messages.push({
        customerId: scored.customerId,
        english: result.english,
        hindi: result.hindi,
        isEdited: false,
      });
    }

    deps.emitStep(state.runId, 'message', 'done', `${messages.length} messages generated`);
    return { generatedMessages: messages };
  };
}
