import { END, START, StateGraph } from '@langchain/langgraph';
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

import type { PrismaClient } from '@banking-crm/database';

import { createBehaviorPersonaNode } from '../nodes/behavior-persona.node';
import { createFetchCustomersNode } from '../nodes/fetch-customers.node';
import { createFetchTransactionsNode } from '../nodes/fetch-transactions.node';
import { createLlmScoreAdjustNode } from '../nodes/llm-score-adjust.node';
import { createMessageNode } from '../nodes/message.node';
import { createPlannerNode } from '../nodes/planner.node';
import { createRecommendationNode } from '../nodes/recommendation.node';
import { createScoreExplainerNode } from '../nodes/score-explainer.node';
import { createScoringNode } from '../nodes/scoring.node';
import { CrmAgentAnnotation } from './state';

export interface CrmGraphDeps {
  prisma: PrismaClient;
  openaiApiKey: string;
  checkpointer: PostgresSaver;
  emitStep: (
    runId: string,
    step: string,
    status: string,
    detail?: string,
    progress?: { current: number; total: number },
  ) => void;
  isPaused: (runId: string) => Promise<boolean>;
}

export function buildCrmGraph(deps: CrmGraphDeps): ReturnType<typeof compileGraph> {
  return compileGraph(deps);
}

function compileGraph(deps: CrmGraphDeps) {
  const graph = new StateGraph(CrmAgentAnnotation)
    .addNode(
      'planner',
      createPlannerNode({
        openaiApiKey: deps.openaiApiKey,
        emitStep: deps.emitStep,
      }),
    )
    .addNode(
      'fetchCustomers',
      createFetchCustomersNode({
        prisma: deps.prisma,
        emitStep: deps.emitStep,
      }),
    )
    .addNode(
      'fetchTransactions',
      createFetchTransactionsNode({
        prisma: deps.prisma,
        emitStep: deps.emitStep,
      }),
    )
    .addNode(
      'behaviorPersona',
      createBehaviorPersonaNode({
        openaiApiKey: deps.openaiApiKey,
        emitStep: deps.emitStep,
      }),
    )
    .addNode('scoring', createScoringNode({ emitStep: deps.emitStep }))
    .addNode(
      'llmScoreAdjust',
      createLlmScoreAdjustNode({
        openaiApiKey: deps.openaiApiKey,
        emitStep: deps.emitStep,
      }),
    )
    .addNode(
      'scoreExplainer',
      createScoreExplainerNode({
        openaiApiKey: deps.openaiApiKey,
        emitStep: deps.emitStep,
      }),
    )
    .addNode('recommendation', createRecommendationNode({ emitStep: deps.emitStep }))
    .addNode(
      'message',
      createMessageNode({
        openaiApiKey: deps.openaiApiKey,
        emitStep: deps.emitStep,
        isPaused: deps.isPaused,
      }),
    )
    .addEdge(START, 'planner')
    .addEdge('planner', 'fetchCustomers')
    .addEdge('fetchCustomers', 'fetchTransactions')
    .addEdge('fetchTransactions', 'behaviorPersona')
    .addEdge('behaviorPersona', 'scoring')
    .addEdge('scoring', 'llmScoreAdjust')
    .addEdge('llmScoreAdjust', 'scoreExplainer')
    .addEdge('scoreExplainer', 'recommendation')
    .addEdge('recommendation', 'message')
    .addEdge('message', END);

  return graph.compile({
    checkpointer: deps.checkpointer,
    interruptBefore: ['fetchTransactions', 'message'],
  });
}

export type CompiledCrmGraph = ReturnType<typeof compileGraph>;
