import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { CustomerFilters, Segment } from '@banking-crm/types';

import { sanitizeFilters } from '../utils/filter-parser';
import type { CrmState } from '../graph/state';

const filterSchema = z.object({
  minAge: z.number().optional(),
  maxAge: z.number().optional(),
  cities: z.array(z.string()).optional(),
  segments: z.array(z.enum(['retail', 'premium', 'sme', 'nri'])).optional(),
  minAvgBalance: z.number().optional(),
  minSalary: z.number().optional(),
  hasExistingLoan: z.boolean().optional(),
});

interface PlannerDeps {
  openaiApiKey: string;
  emitStep: (runId: string, step: string, status: string) => void;
}

export function createPlannerNode(deps: PlannerDeps) {
  return async function plannerNode(
    state: CrmState,
  ): Promise<Partial<CrmState>> {
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
          'You extract structured customer filter criteria from a natural language banking query. ' +
          'Return only what is explicitly or clearly implied in the query. ' +
          'Valid segments: retail, premium, sme, nri. Salary/balance values are in Indian Rupees (₹).',
      },
      {
        role: 'user',
        content: state.naturalLanguageQuery,
      },
    ]);

    const resolvedFilters: CustomerFilters = sanitizeFilters({
      ...result,
      segments: result.segments as Segment[] | undefined,
    });

    deps.emitStep(state.runId, 'planner', 'done');
    return {
      resolvedFilters,
      plannerNote: `Custom mode: extracted filters from query`,
    };
  };
}
