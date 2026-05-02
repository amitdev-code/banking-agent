# Architecture Decision Record

## ADR-001: Session-based auth over JWT

**Decision**: Use `express-session` + `connect-pg-simple` (PostgreSQL session store).

**Rationale**: Banking context demands instant revocation. JWTs are stateless — a stolen token remains valid until expiry. Session-based auth allows immediate logout (`req.session.destroy()`), satisfies compliance requirements, and eliminates refresh token complexity.

**Trade-off**: Sticky sessions needed in multi-instance deployments (mitigated by storing sessions in shared Postgres, not in-memory).

---

## ADR-002: Row-level tenantId over schema-per-tenant

**Decision**: Every table carries a `tenantId` foreign key. All queries include `WHERE tenantId = ?`.

**Rationale**: Schema-per-tenant requires dynamic connection switching, complicates migrations, and needs Prisma workarounds. Row-level isolation is simpler, testable, and sufficient for branch-level multi-tenancy at this scale.

**Trade-off**: Single compromised query could expose cross-tenant data if `tenantId` filter is forgotten. Mitigated by `SessionGuard` cross-tenant validation and repository-layer enforcement.

---

## ADR-003: PII masking at HTTP interceptor layer (not DB)

**Decision**: `PiiMaskingInterceptor` runs globally on all HTTP responses, recursively masking fields per `user.piiVisibility`.

**Rationale**: Masking in the DB layer prevents AI nodes from working with real data. Masking at the API layer keeps AI processing unaffected while ensuring HTTP consumers never see unauthorized PII. Single code path, fully testable.

**Trade-off**: WebSocket payloads bypass the interceptor — intentional, as real-time step events contain no PII.

---

## ADR-004: Deterministic scoring engine (no LLM)

**Decision**: Customer scoring uses 7 weighted rules + loan penalty, all deterministic arithmetic.

**Rationale**: Auditable, explainable, zero LLM cost per customer, reproducible across runs. A regulator can trace exactly why a customer scored 82. LLMs introduce non-determinism and cost that are unjustified for a scoring task with clear business rules.

**Trade-off**: Cannot capture nuanced behavioral signals that a trained ML model would. Acceptable for a loan conversion CRM assistant.

---

## ADR-005: Readiness Index (behavioral state, not product tiers)

**Decision**: `Primed / Engaged / Dormant / At-Risk` based on score bands (≥88 / ≥75 / ≥55 / <55).

**Rationale**: Tiers like "Gold/Silver/Bronze" imply product eligibility. Readiness labels describe the customer's behavioral state — actionable for CRM agents. "Primed" means act now; "At-Risk" means intervention needed.

---

## ADR-006: Sigmoid for conversion probability

**Decision**: `1 / (1 + e^(-0.06*(score-75)))` with midpoint 75 (qualify threshold).

**Rationale**: Continuous output (0–1) suitable for ranking. Midpoint at 75 means the qualify threshold maps to exactly 0.5 probability, providing intuitive calibration. Steepness 0.06 gives meaningful spread across the 0–110 score range.

---

## ADR-007: Salary detection via transaction category (not DB column)

**Decision**: `avgMonthlySalary` is computed from `Transaction` records with `category=SALARY` and `type=CREDIT`. No salary column on `Customer`.

**Rationale**: Models real bank data where salary is inferred from transaction patterns, not explicitly stored. Makes the system realistic for a banking context. `avgMonthlyBalance` and `hasActiveLoan` are cached derived fields for performance.

---

## ADR-008: LangGraph PostgresSaver for checkpointing

**Decision**: Use `@langchain/langgraph-checkpoint-postgres` with the existing Postgres instance.

**Rationale**: No additional infrastructure required. Pause/resume via `interrupt()` saves checkpoint state to Postgres. Resume restores exactly from the message node if paused mid-workflow.

---

## ADR-009: `agentOutput` JSONB for history replay

**Decision**: Store the full `CrmAgentState` as JSONB in `AnalysisRun.agentOutput` on completion.

**Rationale**: Enables `/history/:id` to replay any past run without re-executing the workflow. The scored results with messages are deterministically stored — no LLM re-call needed.

---

## ADR-010: Fire-and-forget async workflow execution

**Decision**: `POST /crm/run` returns `{ runId }` immediately. Workflow runs in the background, emitting progress via WebSocket.

**Rationale**: A full analysis (1000 customers × scoring × LLM message generation) takes 30–120 seconds. Blocking the HTTP response is not viable. WebSocket delivers real-time progress; the client subscribes to `run:${runId}` room.

---

## ADR-011: Single groupBy query to prevent N+1

**Decision**: Aggregate all transactions in one `prisma.transaction.groupBy()` call across all customerIds, then build summaries in-memory.

**Rationale**: N+1 queries (one transaction query per customer) would take O(n) DB round trips. A single groupBy + one raw SQL for monthly salary runs in O(1) round trips regardless of customer count.

---

## ADR-012: OpenAI function calling for NL filter parsing

**Decision**: Custom mode uses OpenAI structured output with a strict JSON schema tool `extract_customer_filters` to parse natural language queries into `CustomerFilters`.

**Rationale**: Structured output guarantees valid JSON that matches the filter schema. On ambiguity, defaults to empty filters (fetch all) — never throws or silently corrupts.
