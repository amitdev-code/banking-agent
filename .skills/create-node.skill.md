# Skill: Create LangGraph Node

Use this template when adding a new node to the CRM workflow graph.

## Node File Template

```typescript
// packages/ai/src/nodes/<node-name>.node.ts
import type { CrmAgentState } from '@banking-crm/types';

// Injected service — passed at graph build time, not imported directly
interface NodeDeps {
  someService: SomeService;
  gateway: CrmGateway;
}

export function createSomeNode(deps: NodeDeps) {
  return async function someNode(
    state: typeof CrmAgentAnnotation.State,
  ): Promise<Partial<typeof CrmAgentAnnotation.State>> {
    deps.gateway.emitStepUpdate(state.runId, {
      runId: state.runId,
      step: 'someStep',
      status: 'running',
      timestamp: Date.now(),
    });

    // Check pause before expensive operations
    if (state.isPaused) {
      const { interrupt } = await import('@langchain/langgraph');
      return interrupt('Workflow paused by user');
    }

    // Delegate to service — no business logic here
    const result = await deps.someService.doWork(state.runId, state.tenantId, state.inputField);

    deps.gateway.emitStepUpdate(state.runId, {
      runId: state.runId,
      step: 'someStep',
      status: 'done',
      timestamp: Date.now(),
    });

    return { outputField: result };
  };
}
```

## Rules

- Node function returns a **factory function** that accepts deps — enables DI without NestJS
- Always emit WebSocket step event at start (`running`) and end (`done`)
- Check `state.isPaused` before any LLM call or slow DB query
- Return only the state fields this node modifies — use `Partial<State>`
- Never throw silently — let errors propagate to LangGraph for checkpoint + error emit

## Registering in the Graph

In `packages/ai/src/graph/crm.graph.ts`:

```typescript
graph.addNode('someStep', createSomeNode({ someService, gateway }))
graph.addEdge('previousStep', 'someStep')
graph.addEdge('someStep', 'nextStep')
```

## WebSocket Step Names

Must match `WorkflowStepName` union in `packages/types/src/ws.types.ts`:
- `'planner'`
- `'fetchCustomers'`
- `'fetchTransactions'`
- `'scoring'`
- `'recommendation'`
- `'message'`

Add new step names to the union type before creating a new node.
