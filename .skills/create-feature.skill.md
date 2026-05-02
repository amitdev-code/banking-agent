# Skill: Create Feature

Use this checklist when adding a new feature to the Banking CRM system.

## Checklist

### 1. Types (packages/types)
- [ ] Define input/output interfaces in the appropriate `*.types.ts` file
- [ ] Export from `packages/types/src/index.ts`

### 2. Database (packages/database) — if new data model needed
- [ ] Add model to `prisma/schema.prisma`
- [ ] Add `tenantId` field and index
- [ ] Run `pnpm db:generate` and `pnpm db:migrate`
- [ ] Update seed data if the model needs fixtures

### 3. Backend (apps/api)
- [ ] Create `apps/api/src/modules/<feature>/` folder
- [ ] Create `<feature>.module.ts`
- [ ] Create `<feature>.repository.ts` (Prisma queries, always scoped by tenantId)
- [ ] Create `<feature>.service.ts` (business logic, calls repository)
- [ ] Create `<feature>.controller.ts` (routing only, uses DTOs)
- [ ] Create `dto/<action>-<feature>.dto.ts` with class-validator decorators
- [ ] Register module in `app.module.ts`
- [ ] Add route to API endpoint list in `DECISIONS.md`

### 4. AI Integration — if feature involves an agent node
- [ ] Follow `create-node.skill.md` for any new LangGraph nodes
- [ ] Follow `create-tool.skill.md` for any new LangChain tools

### 5. Frontend (apps/web)
- [ ] Follow `create-page.skill.md` for any new pages
- [ ] Create components in appropriate `components/<feature>/` folder
- [ ] Create custom hook in `hooks/use-<feature>.ts`
- [ ] Add route to navigation if user-facing

### 6. Tests
- [ ] Unit test: `<feature>.service.spec.ts` — test business logic with mocked repository
- [ ] Integration test: `apps/api/test/integration/<feature>.integration.spec.ts`
- [ ] E2E test: `apps/web/e2e/<feature>.spec.ts` if UI is involved

### 7. Review
- [ ] Run `pnpm typecheck` — zero errors
- [ ] Run `pnpm lint` — zero warnings
- [ ] Run `pnpm test` — all tests pass
- [ ] Verify tenant isolation: test with a user from tenant B cannot access tenant A data
