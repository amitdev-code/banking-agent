import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { CustomerFilters, Segment } from '@banking-crm/types';

import { sanitizeFilters } from '../utils/filter-parser';
import type { CrmState } from '../graph/state';

const DB_CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Surat',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Thane',
  'Bhopal',
  'Visakhapatnam',
  'Pimpri-Chinchwad',
  'Patna',
  'Vadodara',
  'Ghaziabad',
  'Ludhiana',
  'Agra',
  'Nashik',
  'Faridabad',
  'Meerut',
  'Rajkot',
  'Varanasi',
  'Srinagar',
  'Aurangabad',
  'Dhanbad',
  'Amritsar',
  'Ranchi',
  'Coimbatore',
  'Jodhpur',
] as const;

const filterSchema = z.object({
  minAge: z.number().nullable().optional(),
  maxAge: z.number().nullable().optional(),
  cities: z.array(z.enum(DB_CITIES)).nullable().optional(),
  segments: z
    .array(z.enum(['retail', 'premium', 'sme', 'nri']))
    .nullable()
    .optional(),
  minAvgBalance: z.number().nullable().optional(),
  minSalary: z.number().nullable().optional(),
  hasExistingLoan: z.boolean().nullable().optional(),
});

interface PlannerDeps {
  openaiApiKey: string;
  emitStep: (
    runId: string,
    step: string,
    status: string,
    detail?: string,
    progress?: { current: number; total: number },
  ) => void;
}

export function createPlannerNode(deps: PlannerDeps) {
  return async function plannerNode(state: CrmState): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'planner', 'running');

    if (state.mode === 'agent') {
      deps.emitStep(state.runId, 'planner', 'done');
      return {
        resolvedFilters: {},
        plannerNote: 'Agent mode: using default filters — all customers',
      };
    }

    if (!state.naturalLanguageQuery) {
      deps.emitStep(state.runId, 'planner', 'done');
      return {
        resolvedFilters: {},
        plannerNote: 'Custom mode: no query provided, using empty filters',
      };
    }

    const model = new ChatOpenAI({
      apiKey: deps.openaiApiKey,
      model: 'gpt-4o-mini',
      temperature: 0,
    });

    const modelWithTool = model.withStructuredOutput(filterSchema, {
      name: 'extract_customer_filters',
    });

    const result = await modelWithTool.invoke([
      {
        role: 'system',
        content:
          'You extract structured customer filter criteria from a natural language banking CRM query.\n' +
          'Apply these rules deterministically — the same query must always produce the same output.\n\n' +
          'CITY RULES (strict):\n' +
          `- Valid cities (exact DB strings): ${DB_CITIES.join(', ')}\n` +
          '- Map any city mention to the closest match. Examples:\n' +
          '  "delhi"/"new delhi"/"dilli" → "Delhi"\n' +
          '  "bangalore"/"blr"/"bengalore" → "Bengaluru"\n' +
          '  "bombay"/"bom" → "Mumbai"\n' +
          '  "hyd"/"hydrabad" → "Hyderabad"\n' +
          '  "madras" → "Chennai"\n' +
          '  "calcutta" → "Kolkata"\n' +
          '- Return ONLY cities from the valid list, case-sensitive. Unmatched cities are omitted.\n\n' +
          'AGE RULES (fixed thresholds — never deviate):\n' +
          '- "young" / "youth" → maxAge: 30\n' +
          '- "middle-aged" / "mid-age" → minAge: 31, maxAge: 50\n' +
          '- "senior" / "elderly" / "old" → minAge: 51\n' +
          '- "millennial" → minAge: 27, maxAge: 42\n' +
          '- Explicit ages always take priority (e.g. "above 40" → minAge: 40).\n\n' +
          'SALARY / BALANCE RULES (fixed thresholds — never deviate):\n' +
          '- "high salary" / "high income" / "rich" → minSalary: 75000\n' +
          '- "medium salary" / "mid income" → minSalary: 30000\n' +
          '- "low salary" / "low income" → minSalary: 0 (omit filter — fetch all, scoring will rank)\n' +
          '- "high balance" / "wealthy" → minAvgBalance: 100000\n' +
          '- "good balance" → minAvgBalance: 50000\n' +
          '- Explicit amounts always take priority (e.g. "salary above 60000" → minSalary: 60000).\n\n' +
          'LOAN RULES:\n' +
          '- "existing loan" / "has loan" / "loan holders" / "already borrowed" → hasExistingLoan: true\n' +
          '- "no loan" / "loan-free" / "without loan" → hasExistingLoan: false\n' +
          '- If not mentioned, omit hasExistingLoan entirely.\n\n' +
          'SEGMENT RULES:\n' +
          '- Valid values: retail, premium, sme, nri (lowercase, exact).\n' +
          '- "business customers" / "business owners" → sme\n' +
          '- "high-net-worth" / "HNI" / "affluent" → premium\n' +
          '- "NRI" / "non-resident" → nri\n' +
          '- "regular customers" / "general" → retail\n\n' +
          'GENERAL RULES:\n' +
          '- Return only filters that are explicitly stated or unambiguously implied.\n' +
          '- Never infer a filter from vague language not covered above.\n' +
          '- Temperature is 0 — your output must be fully deterministic.',
      },
      {
        role: 'user',
        content: state.naturalLanguageQuery,
      },
    ]);

    const resolvedFilters: CustomerFilters = sanitizeFilters({
      minAge: result.minAge ?? undefined,
      maxAge: result.maxAge ?? undefined,
      cities: result.cities ?? undefined,
      segments: (result.segments ?? undefined) as Segment[] | undefined,
      minAvgBalance: result.minAvgBalance ?? undefined,
      minSalary: result.minSalary ?? undefined,
      hasExistingLoan: result.hasExistingLoan ?? undefined,
    });

    deps.emitStep(state.runId, 'planner', 'done');
    return {
      resolvedFilters,
      plannerNote: `Custom mode: extracted filters from query`,
    };
  };
}
