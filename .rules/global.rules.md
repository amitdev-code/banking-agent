# Global Coding Rules

## TypeScript

- `strict: true` always enabled across all packages and apps
- No `any` — use `unknown` and narrow with type guards
- No implicit any — `noImplicitAny: true`
- No `@ts-ignore` — fix the root type issue instead
- Explicit return types required on all functions and methods
- Use interfaces/types from `@banking-crm/types` only — never redefine shared shapes locally
- `noUncheckedIndexedAccess: true` — always guard array/object index access

## Naming Conventions

- **Folders**: `kebab-case` (e.g., `crm-module/`, `score-badge/`)
- **Variables / functions**: `camelCase`
- **Classes / Components / Interfaces**: `PascalCase`
- **Environment constants**: `UPPER_SNAKE_CASE` (e.g., `SESSION_SECRET`, `OPENAI_API_KEY`)
- **Enums**: `PascalCase` name, `UPPER_SNAKE_CASE` values (e.g., `Role.ADMIN`)
- **Files**: `kebab-case.type.ts` — e.g., `crm.service.ts`, `pii-masking.interceptor.ts`

## Import Order

Always group imports in this exact order (blank line between groups):

1. External packages (`react`, `next`, `@nestjs/...`, `langchain`, etc.)
2. Internal workspace packages (`@banking-crm/types`, `@banking-crm/database`, etc.)
3. Local imports (`./`, `../`)

No circular imports. Enforce via ESLint `import/no-cycle`.

## Functions

- Single responsibility — one function does one thing
- Max ~40 lines preferred; split if longer
- Pure functions where possible — no hidden side effects
- Avoid deeply nested logic — extract to named helpers

## Components (React / Next.js)

- **Server components by default** — add `'use client'` only when necessary
- One component per file
- No business logic inside components — delegate to hooks or services
- Always provide loading states, empty states, and error boundaries for data-fetching components

## API (NestJS)

- DTO validation is mandatory on every controller input — use `class-validator`
- `class-transformer` with `@Transform` for sanitization
- No logic in controllers — controllers only parse request, call service, return response
- All Prisma access through repository/service layer — never import `PrismaClient` directly in a controller

## Prisma / Database

- All DB access via repository or service — never raw Prisma in controllers or nodes
- Always scope queries with `tenantId` — tenant isolation is not optional
- Use `select` to avoid over-fetching PII fields when full customer object is not needed

## AI / LangGraph

- Nodes must be thin — orchestration only
- No business logic inside nodes — delegate to services and the scoring engine
- No DB access inside nodes — use injected service methods
- Prompts stored in `packages/ai/src/prompts/` or `packages/ai/src/rag/templates/` — never inline
- Scoring is deterministic — never use LLM for scoring
- LLM used only for: (1) natural language filter parsing in planner node, (2) message generation

## Comments

- Write comments only when the WHY is non-obvious — a hidden constraint, a workaround, a subtle invariant
- Never write comments that describe what the code does — well-named identifiers do that
- Never write multi-line comment blocks or JSDoc unless a public API requires it
