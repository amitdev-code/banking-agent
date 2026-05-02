# AI Architecture Rules

## LangGraph

- LangGraph is the **only** orchestration layer — do not build custom async pipelines
- All workflow state is defined via `Annotation.Root` in `packages/ai/src/graph/state.ts`
- Checkpointing uses `PostgresSaver` from `@langchain/langgraph-checkpoint-postgres`
- The `thread_id` config key always equals the `runId` (CUID) — one thread per analysis run
- Pause/resume via LangGraph's `interrupt()` mechanism — never implement custom pause logic

## Node Rules

- Each node is a thin async function: `(state: CrmAgentState) => Partial<CrmAgentState>`
- Nodes receive state, call a service method, return updated state fields only
- **No Prisma access inside nodes** — delegate to service methods injected at graph build time
- **No business logic inside nodes** — scoring engine, filter parsing, and recommendation logic live in services
- **No LLM calls inside nodes** — delegate to `MessageService` or `PlannerService`
- Each node emits a WebSocket event via `CrmGateway` at entry and exit
- Nodes check `state.isPaused` before expensive operations and call `interrupt()` if true

## Scoring Engine

- Scoring is **100% deterministic** — no randomness, no LLM
- Each scoring dimension is an isolated pure function in its own `*.rule.ts` file
- Rules return a number within their defined max — never exceed max, never go below 0
- Loan penalty applied after summing all rule scores — capped at -10 total
- Hard exclusion (no income) checked first — if excluded, skip all rules and return immediately
- `engine.ts` composes rules in a fixed order: salary → balance → spending → salaryCredited → products → age → activity → loanPenalty
- Sigmoid applied last to produce `conversionProbability`

## LLM Usage

LLM is used in **exactly two places**:

1. **Planner node (custom mode)**: OpenAI function calling to extract `CustomerFilters` from natural language. Uses `gpt-4o-mini` with a strict JSON schema tool. If extraction fails → throw error, do not silently default.
2. **Message node**: RAG retrieval + OpenAI `gpt-4o-mini` to generate `{ english: string, hindi: string }`. If OpenAI call fails → throw error, propagate to state, show error in UI. No template fallback.

## Prompts

- All LLM prompts are in `packages/ai/src/rag/templates/` (product RAG templates) or inline in the service using LangChain `PromptTemplate`
- Never hard-code prompt strings inside node files
- Prompts must include: system context, customer financial summary (no PII), product context, output format instructions

## RAG

- Product templates are Markdown files in `packages/ai/src/rag/templates/`
- Retriever selects the appropriate template based on `recommendedProducts` from the recommendation node
- Templates injected into the message generation prompt as context
- No vector DB required — templates are small enough for direct injection

## Error Handling in Nodes

- If a node throws, LangGraph marks the run as failed and saves the checkpoint at that point
- The `AiService` catches graph errors, updates `AnalysisRun.status = FAILED`, and emits `run:error` via WebSocket
- Never swallow errors inside nodes — always propagate

## Type Safety

- All node inputs and outputs are typed via `CrmAgentAnnotation` — never use `any` in state
- `TransactionSummary`, `ScoredCustomer`, `GeneratedMessage` types from `@banking-crm/types`
- Prisma model types are never used directly in node signatures — always map to domain types first
