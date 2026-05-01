"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlannerNode = createPlannerNode;
const openai_1 = require("@langchain/openai");
const zod_1 = require("zod");
const filter_parser_1 = require("../utils/filter-parser");
const filterSchema = zod_1.z.object({
    minAge: zod_1.z.number().optional(),
    maxAge: zod_1.z.number().optional(),
    cities: zod_1.z.array(zod_1.z.string()).optional(),
    segments: zod_1.z.array(zod_1.z.enum(['retail', 'premium', 'sme', 'nri'])).optional(),
    minAvgBalance: zod_1.z.number().optional(),
    minSalary: zod_1.z.number().optional(),
    hasExistingLoan: zod_1.z.boolean().optional(),
});
function createPlannerNode(deps) {
    return async function plannerNode(state) {
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
        const model = new openai_1.ChatOpenAI({
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
                content: 'You extract structured customer filter criteria from a natural language banking query. ' +
                    'Return only what is explicitly or clearly implied in the query. ' +
                    'Valid segments: retail, premium, sme, nri. Salary/balance values are in Indian Rupees (₹).',
            },
            {
                role: 'user',
                content: state.naturalLanguageQuery,
            },
        ]);
        const resolvedFilters = (0, filter_parser_1.sanitizeFilters)({
            ...result,
            segments: result.segments,
        });
        deps.emitStep(state.runId, 'planner', 'done');
        return {
            resolvedFilters,
            plannerNote: `Custom mode: extracted filters from query`,
        };
    };
}
