import { SystemMessage } from '@langchain/core/messages';

import type { CrmSessionState } from './state';

export function buildStateContext(state: CrmSessionState): SystemMessage {
  const lines: string[] = [
    'You are an AI assistant for a banking CRM. You help relationship managers analyze customers, score them, and recommend products.',
    '',
    '## Available Tools',
    '- **fetch_customers**: Fetch customers from DB using natural language criteria or filters',
    '- **fetch_transactions**: Load transaction history for currently fetched customers (needed before scoring)',
    '- **analyze_customers**: Run persona classification + scoring + AI score adjustment on fetched customers',
    '- **analyze_spending**: Run LLM-based spending pattern analysis for fetched customers',
    '- **explain_scores**: Generate human-readable explanations for scored customers',
    '- **recommend_products**: Match banking products (Personal Loan, Home Loan, Credit Card) to qualified customers',
    '- **generate_messages**: Generate personalized WhatsApp outreach messages (requires user approval before running)',
    '',
    '## Current Session State',
  ];

  // Customers
  if (state.customers.length === 0) {
    lines.push('- Customers: **not fetched yet**');
  } else {
    const cities = [...new Set(state.customers.map((c) => c.city))].slice(0, 5).join(', ');
    lines.push(
      `- Customers: **${state.customers.length} loaded** (cities: ${cities}${state.customers.length > 5 ? '...' : ''})`,
    );
    const customerPreview = state.customers
      .slice(0, 12)
      .map(
        (c) =>
          `${c.fullName} (${c.city}, age ${c.age}, balance ₹${Math.round(c.avgMonthlyBalance).toLocaleString('en-IN')})`,
      )
      .join('; ');
    lines.push(
      `- Loaded customer sample: ${customerPreview}${state.customers.length > 12 ? '; ...' : ''}`,
    );
  }

  // Transactions
  if (state.transactionSummaries.length === 0) {
    lines.push('- Transactions: **not loaded**');
  } else {
    lines.push(`- Transactions: **loaded** for ${state.transactionSummaries.length} customers`);
  }

  // Scored
  if (state.scoredCustomers.length === 0) {
    lines.push('- Scoring: **not done**');
  } else {
    const qualified = state.scoredCustomers.filter((s) => s.qualifies).length;
    const avg = Math.round(
      state.scoredCustomers.reduce((s, c) => s + c.totalScore, 0) / state.scoredCustomers.length,
    );
    lines.push(
      `- Scoring: **done** — ${qualified} qualified / ${state.scoredCustomers.length} total (avg score: ${avg})`,
    );
  }

  // Recommendations
  const withRecs = state.scoredCustomers.filter((s) => s.recommendedProducts?.length > 0).length;
  if (withRecs > 0) {
    lines.push(`- Recommendations: **done** — ${withRecs} customers matched to products`);
  } else if (state.scoredCustomers.length > 0) {
    lines.push('- Recommendations: **not done**');
  }

  // Messages
  if (state.generatedMessages.length === 0) {
    lines.push('- Messages: **not generated**');
  } else {
    lines.push(`- Messages: **${state.generatedMessages.length} messages generated**`);
  }

  if (state.spendingInsights.length === 0) {
    lines.push('- Spending analytics: **not generated**');
  } else {
    lines.push(
      `- Spending analytics: **generated** for ${state.spendingInsights.length} customers`,
    );
  }

  lines.push('');
  lines.push('## Rules');
  lines.push(
    '- Do NOT re-fetch customers if customers are already loaded (unless the user explicitly asks).',
  );
  lines.push('- For follow-up prompts, use the already loaded customers as the retrieval context.');
  lines.push('- Do NOT re-run transactions/scoring if already done (unless user asks to redo).');
  lines.push('- Always fetch transactions before analyze_customers.');
  lines.push('- Use analyze_spending when user asks for spending behavior insights or analytics.');
  lines.push('- Always run analyze_customers before recommend_products or explain_scores.');
  lines.push('- Only run generate_messages when user explicitly asks for outreach content.');

  return new SystemMessage(lines.join('\n'));
}
