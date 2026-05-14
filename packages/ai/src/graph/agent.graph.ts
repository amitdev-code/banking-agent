import { END, START, StateGraph } from '@langchain/langgraph';
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

import type { PrismaClient } from '@banking-crm/database';
import type { ScoringRulesConfig } from '@banking-crm/types';

import { CrmSessionAnnotation } from './state';
import type { CrmSessionState } from './state';
import { buildStateContext } from './state-summarizer';
import { createLlmTools, dispatchTool } from '../tools';
import type { EmitTool } from '../tools';

export interface AgentGraphDeps {
  prisma: PrismaClient;
  openaiApiKey: string;
  checkpointer: PostgresSaver;
  emitTool: EmitTool;
  getScoringConfig: (tenantId: string) => Promise<ScoringRulesConfig>;
}

// ─── Agent Node ───────────────────────────────────────────────────────────────

function createAgentNode(deps: AgentGraphDeps) {
  const llmTools = createLlmTools();
  const llm = new ChatOpenAI({ apiKey: deps.openaiApiKey, model: 'gpt-4o', temperature: 0 });
  const llmWithTools = llm.bindTools(llmTools);

  return async function agentNode(state: CrmSessionState): Promise<Partial<CrmSessionState>> {
    const contextMessage = buildStateContext(state);
    const allMessages: BaseMessage[] = [contextMessage, ...state.messages];
    const response = await llmWithTools.invoke(allMessages);
    return { messages: [response] };
  };
}

// ─── Tool Dispatch Node ───────────────────────────────────────────────────────

function createToolNode(deps: AgentGraphDeps) {
  return async function toolNode(state: CrmSessionState): Promise<Partial<CrmSessionState>> {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMessage.tool_calls ?? [];
    if (toolCalls.length === 0) return {};

    const toolDeps = {
      prisma: deps.prisma,
      openaiApiKey: deps.openaiApiKey,
      emitTool: deps.emitTool,
    };
    const toolMessages: ToolMessage[] = [];
    let stateUpdates: Partial<CrmSessionState> = {};

    for (const call of toolCalls) {
      const start = Date.now();
      deps.emitTool(state.sessionId, call.name, 'start');
      try {
        const result = await dispatchTool(
          call.name,
          call.args as Record<string, unknown>,
          state,
          toolDeps,
        );
        const durationMs = Date.now() - start;
        deps.emitTool(state.sessionId, call.name, 'done', result.summary, durationMs);

        // Merge data fields from tool result into state
        stateUpdates = { ...stateUpdates, ...result.stateUpdate };

        toolMessages.push(
          new ToolMessage({
            content: JSON.stringify({
              summary: result.summary,
              resultType: result.resultType ?? null,
              resultData: result.resultData ?? null,
              durationMs,
            }),
            tool_call_id: call.id ?? call.name,
          }),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        deps.emitTool(state.sessionId, call.name, 'error', msg);
        toolMessages.push(
          new ToolMessage({ content: `Error: ${msg}`, tool_call_id: call.id ?? call.name }),
        );
      }
    }

    return { messages: toolMessages, ...stateUpdates };
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

function shouldContinue(state: CrmSessionState): 'tools' | typeof END {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) return 'tools';
  return END;
}

// ─── Graph Builder ────────────────────────────────────────────────────────────

export function buildAgentGraph(deps: AgentGraphDeps) {
  const graph = new StateGraph(CrmSessionAnnotation)
    .addNode('agent', createAgentNode(deps))
    .addNode('tools', createToolNode(deps))
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, { tools: 'tools', [END]: END })
    .addEdge('tools', 'agent');

  // No interruptBefore needed — generate_messages tool calls interrupt() inline
  return graph.compile({ checkpointer: deps.checkpointer });
}

export type CompiledAgentGraph = ReturnType<typeof buildAgentGraph>;
