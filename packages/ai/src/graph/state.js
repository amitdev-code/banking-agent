"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmAgentAnnotation = void 0;
const langgraph_1 = require("@langchain/langgraph");
exports.CrmAgentAnnotation = langgraph_1.Annotation.Root({
    runId: (0, langgraph_1.Annotation)(),
    tenantId: (0, langgraph_1.Annotation)(),
    mode: (0, langgraph_1.Annotation)(),
    naturalLanguageQuery: (0, langgraph_1.Annotation)(),
    resolvedFilters: (0, langgraph_1.Annotation)({
        reducer: (existing, update) => ({ ...existing, ...update }),
        default: () => ({}),
    }),
    customers: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => [],
    }),
    transactionSummaries: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => [],
    }),
    scoredCustomers: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => [],
    }),
    recommendations: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => [],
    }),
    generatedMessages: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => [],
    }),
    isPaused: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => false,
    }),
    error: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    plannerNote: (0, langgraph_1.Annotation)({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
});
