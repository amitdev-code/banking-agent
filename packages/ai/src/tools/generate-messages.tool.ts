import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type {
  GeneratedMessage,
  ProductType,
  ScoredCustomer,
  TransactionSummary,
} from '@banking-crm/types';

import { buildRagContext } from '../rag/retriever';
import type { CrmSessionState } from '../graph/state';
import type { ToolResult, EmitTool } from './index';

const messageSchema = z.object({ english: z.string(), hindi: z.string() });

const PERSONA_TONE: Record<string, string> = {
  Saver: 'conservative and value-focused — highlight low EMI, long-term wealth building',
  Spender: 'aspirational — highlight lifestyle benefits, rewards, and flexibility',
  Investor: 'analytical — highlight ROI, leverage, and portfolio diversification angle',
  IrregularIncome:
    'flexible and empathetic — acknowledge variable income, highlight adaptable repayment',
  Balanced: 'professional and straightforward — highlight reliability and convenience',
};

function buildCustomerContext(
  scored: ScoredCustomer,
  summary: TransactionSummary,
  persona?: string,
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
  const toneHint = persona ? PERSONA_TONE[persona] : undefined;
  return [
    `Score: ${scored.totalScore}/100 (${scored.readinessLabel})`,
    `Conversion probability: ${Math.round(scored.conversionProbability * 100)}%`,
    `Average monthly salary: ₹${Math.round(avgSalary).toLocaleString('en-IN')}`,
    `Average balance: ₹${Math.round(summary.avgMonthlyBalance).toLocaleString('en-IN')}`,
    `Top spending: ${topCategories || 'N/A'}`,
    `Recommended products: ${scored.recommendedProducts.map((r) => r.product).join(', ')}`,
    persona ? `Behavior persona: ${persona}` : null,
    toneHint ? `Tone guidance: ${toneHint}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function runGenerateMessages(
  input: { customerIds?: string[] },
  state: CrmSessionState,
  deps: { openaiApiKey: string; emitTool: EmitTool },
): Promise<ToolResult> {
  const requestedIds = input.customerIds?.length ? new Set(input.customerIds) : null;
  const qualifiedCustomers = state.scoredCustomers.filter(
    (s) => s.qualifies && (!requestedIds || requestedIds.has(s.customerId)),
  );

  if (qualifiedCustomers.length === 0) {
    return { summary: 'No qualified customers found for message generation.', stateUpdate: {} };
  }

  deps.emitTool(
    state.sessionId,
    'generate_messages',
    'start',
    `Generating messages for ${qualifiedCustomers.length} customers`,
  );

  const model = new ChatOpenAI({
    apiKey: deps.openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0.7,
  }).withStructuredOutput(messageSchema);
  const summaryMap = new Map(state.transactionSummaries.map((s) => [s.customerId, s]));
  const personaMap = new Map(state.customerPersonas.map((p) => [p.customerId, p.persona]));

  const messages: GeneratedMessage[] = [];
  for (const scored of qualifiedCustomers) {
    const summary = summaryMap.get(scored.customerId);
    if (!summary) continue;
    const products = scored.recommendedProducts.map((r) => r.product as ProductType);
    const ragContext = buildRagContext(products.length > 0 ? products : ['PERSONAL_LOAN']);
    const persona = scored.persona ?? personaMap.get(scored.customerId);
    try {
      const result = await model.invoke([
        {
          role: 'system',
          content:
            'You are a banking relationship manager generating personalized WhatsApp messages for loan products. Generate a message in both English and Hindi. Messages must be warm, personalized, concise (under 200 words each), and end with a clear CTA. Do NOT include PII. Reference their spending habits and financial strengths.\n\n## Product Context\n' +
            ragContext,
        },
        {
          role: 'user',
          content: `Generate a WhatsApp message for this customer:\n\n${buildCustomerContext(scored, summary, persona)}`,
        },
      ]);
      messages.push({
        customerId: scored.customerId,
        english: result.english,
        hindi: result.hindi,
        isEdited: false,
      });
    } catch {
      const productsLabel =
        scored.recommendedProducts.map((r) => r.product.replaceAll('_', ' ')).join(', ') ||
        'our tailored offers';
      messages.push({
        customerId: scored.customerId,
        english: `Hello! Based on your recent banking profile, we have identified ${productsLabel} that may suit your current financial needs. If you are interested, reply to this message and our relationship manager will assist you with quick next steps.`,
        hindi: `Namaste! Aapke haal ke banking profile ke aadhar par humne ${productsLabel} ke liye aapko suitable paya hai. Agar aap interested hain, is message ka reply karein - hamara relationship manager turant aapki madad karega.`,
        isEdited: false,
      });
    }
  }

  const customerMap = new Map(state.customers.map((c) => [c.id, c]));

  return {
    summary: `Generated ${messages.length} WhatsApp messages`,
    stateUpdate: { generatedMessages: messages },
    resultType: 'message_card',
    resultData: {
      messages: messages.map((m) => {
        const customer = customerMap.get(m.customerId);
        return {
          resultId: m.customerId,
          customerId: m.customerId,
          fullName: customer?.fullName ?? '',
          phone: customer?.phone ?? '',
          messageEn: m.english,
          messageHi: m.hindi,
        };
      }),
    },
  };
}
