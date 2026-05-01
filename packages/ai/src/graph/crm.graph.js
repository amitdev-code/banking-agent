"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCrmGraph = buildCrmGraph;
const langgraph_1 = require("@langchain/langgraph");
const fetch_customers_node_1 = require("../nodes/fetch-customers.node");
const fetch_transactions_node_1 = require("../nodes/fetch-transactions.node");
const message_node_1 = require("../nodes/message.node");
const planner_node_1 = require("../nodes/planner.node");
const recommendation_node_1 = require("../nodes/recommendation.node");
const scoring_node_1 = require("../nodes/scoring.node");
const state_1 = require("./state");
function buildCrmGraph(deps) {
    return compileGraph(deps);
}
function compileGraph(deps) {
    const graph = new langgraph_1.StateGraph(state_1.CrmAgentAnnotation)
        .addNode('planner', (0, planner_node_1.createPlannerNode)({
        openaiApiKey: deps.openaiApiKey,
        emitStep: deps.emitStep,
    }))
        .addNode('fetchCustomers', (0, fetch_customers_node_1.createFetchCustomersNode)({
        prisma: deps.prisma,
        emitStep: deps.emitStep,
    }))
        .addNode('fetchTransactions', (0, fetch_transactions_node_1.createFetchTransactionsNode)({
        prisma: deps.prisma,
        emitStep: deps.emitStep,
    }))
        .addNode('scoring', (0, scoring_node_1.createScoringNode)({ emitStep: deps.emitStep }))
        .addNode('recommendation', (0, recommendation_node_1.createRecommendationNode)({ emitStep: deps.emitStep }))
        .addNode('message', (0, message_node_1.createMessageNode)({
        openaiApiKey: deps.openaiApiKey,
        emitStep: deps.emitStep,
        isPaused: deps.isPaused,
    }))
        .addEdge(langgraph_1.START, 'planner')
        .addEdge('planner', 'fetchCustomers')
        .addEdge('fetchCustomers', 'fetchTransactions')
        .addEdge('fetchTransactions', 'scoring')
        .addEdge('scoring', 'recommendation')
        .addEdge('recommendation', 'message')
        .addEdge('message', langgraph_1.END);
    return graph.compile({ checkpointer: deps.checkpointer });
}
