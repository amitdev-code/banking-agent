# Banking Agent CRM

AI-powered multi-tenant Banking CRM for personal loan conversion. Identifies high-value customers, scores them deterministically, recommends products, and generates bilingual WhatsApp messages via RAG + LLM.

## Architecture

```mermaid
graph TD
    subgraph "apps/web (Next.js 15)"
        A[Dashboard — 3-panel layout]
        B[History — run replay]
        C[Customer Detail — PII-aware + spending chart]
        D[Settings — scoring bracket editor]
    end

    subgraph "apps/api (NestJS)"
        E[AuthController]
        F[CustomerController]
        G[CrmController]
        H[ScoringConfigController]
        I[CrmGateway — Socket.io]
        J[PiiMaskingInterceptor]
        K[SessionGuard + RolesGuard]
    end

    subgraph "packages/ai"
        L[LangGraph Workflow — 9 nodes]
        M[planner → fetchCustomers → fetchTransactions → scoring → llmScoreAdjust → scoreExplainer → behaviorPersona → recommendation → message]
        N[ScoringEngine — deterministic + configurable brackets]
        O[RAG — product templates]
    end

    subgraph "packages/database"
        P[Prisma Schema]
        Q[ScoringConfig table — per-tenant brackets]
        R[Seed — 1000 customers × 22 scenarios]
    end

    subgraph "Infrastructure"
        S[(PostgreSQL 16)]
        T[(Redis 7)]
    end

    A -->|HTTP + WS| E
    A -->|HTTP + WS| G
    G -->|fire-and-forget| L
    I -->|WebSocket step:update + progress| A
    L --> N
    L --> O
    L -->|persist results| P
    P --> S
    J --> F
    K --> E
    H -->|read/write brackets| Q
    N -->|reads brackets| Q
```

## Monorepo Structure

```
banking-agent-crm/
├── apps/
│   ├── web/                    # Next.js 15 App Router
│   │   ├── src/app/
│   │   │   ├── dashboard/      # 3-panel AI run UI
│   │   │   ├── history/[id]/   # Run replay with dark hero header
│   │   │   ├── customer/[id]/  # Customer profile + spending chart
│   │   │   └── settings/       # Scoring bracket editor
│   │   └── src/components/
│   │       ├── customers/      # CustomerCard, SpendingCategoryChart
│   │       ├── history/        # CompactCustomerRow, RunDetailView
│   │       ├── settings/       # BracketEditor, NlTunePanel
│   │       └── workflow/       # StepList with live progress bars
│   └── api/                    # NestJS
│       └── src/modules/
│           ├── auth/           # Login/logout/me — ADMIN PII override
│           ├── customer/       # Paginated list + spending categories
│           ├── crm/            # Pipeline trigger, history, run detail
│           ├── ai/             # LangGraph orchestrator + logging
│           └── scoring-config/ # Tenant-scoped bracket CRUD
├── packages/
│   ├── config/       # Shared ESLint, TS, Prettier configs
│   ├── types/        # Shared TypeScript interfaces
│   ├── database/     # Prisma schema + client + seed (1000 customers)
│   ├── ai/           # LangGraph graph + scoring engine + RAG
│   └── ui/           # Shared React components (shadcn wrappers)
├── docker-compose.yml
└── turbo.json
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker + Docker Compose
- OpenAI API key

### With Docker Compose

```bash
# Clone and navigate
git clone <repo> banking-agent-crm && cd banking-agent-crm

# Set your OpenAI key
echo "OPENAI_API_KEY=sk-..." > .env

# Start all services (postgres, redis, api, web, db-migrate+seed)
docker-compose up
```

- Web: http://localhost:3000
- API: http://localhost:3001

### Local Development

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Copy and configure environment
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY

# Generate Prisma client + migrate + seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Start all apps in parallel
pnpm dev
```

## Seed Credentials

After seeding, two tenants are created with admin users:

| Tenant Slug        | Email                        | Password     | Role  |
|--------------------|------------------------------|--------------|-------|
| `hdfc-bangalore`   | `admin@hdfc-bangalore.com`   | `Admin@1234` | ADMIN |
| `icici-mumbai`     | `admin@icici-mumbai.com`     | `Admin@1234` | ADMIN |

## Key Features

### Multi-Tenancy
Every entity is scoped by `tenantId`. The `X-Tenant-Slug` header resolves tenant context. `SessionGuard` prevents cross-tenant session reuse.

### PII Masking
`PiiMaskingInterceptor` recursively masks 8 PII fields per user's `piiVisibility` config. Admin users always receive unmasked data regardless of DB column value — the override is applied at login and session refresh in `auth.service.ts`.

- Phone: `XXXXXX3210`
- Email: `j***@***.***`
- PAN, Aadhaar, Address, DOB, Account Number

### AI Workflow (LangGraph)

```
START → planner → fetchCustomers → fetchTransactions → scoring
      → llmScoreAdjust → scoreExplainer → behaviorPersona
      → recommendation → message → END
```

- **Agent Mode**: Processes all customers with default filters
- **Custom Mode**: Natural language query → OpenAI function calling → `CustomerFilters`
- **Pause/Resume**: `interrupt()` checkpoint in `message` node
- **Real-time**: WebSocket emits `step:update` events with `progress: { current, total }` counters so the UI shows live per-batch progress bars during fetch, scoring, and recommendation phases

### Scoring Engine

Brackets are configurable per-tenant via the Settings page and persisted in the `ScoringConfig` table. Defaults:

| Rule | Max Points |
|---|---|
| Monthly salary (SALARY CREDIT txns) | 25 |
| Average balance | 25 |
| Spending diversity + income ratio | 20 |
| Months with salary credit (12m) | 15 |
| Product headroom | 10 |
| Age band (28-40 optimal) | 10 |
| Recent activity (30d txns) | 5 |
| Personal loan penalty | −8 |
| Home loan penalty | −3 |
| Combined cap | −10 max |

**Qualify threshold**: score ≥ 75  
**Readiness**: Primed (≥88) · Engaged (≥75) · Dormant (≥55) · At-Risk (<55)

### Spending Category Analytics

The customer detail page shows a donut chart breaking down the last 12 months of debit transactions by category (Grocery, Shopping, Dining, Entertainment, Travel, Fuel, Utilities, Medical, EMI, Other). Powered by a `transaction.groupBy` query in `customer.repository.ts`, displayed via `SpendingCategoryChart` with a savings rate indicator.

### History Run Replay

`/history/[id]` features a dark gradient hero header with run stats, and a filterable/sortable customer list using `CompactCustomerRow` — a collapsible row with an SVG score ring, product pills, persona badge, and expandable breakdown + WhatsApp message panel.

### Configurable Scoring Brackets

Admins can adjust scoring thresholds for each rule via the Settings page. Changes are persisted per-tenant in `ScoringConfig` and picked up on the next pipeline run without a redeploy.

## Scripts

```bash
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm test             # Run unit + integration tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed 1000 customers
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TailwindCSS, shadcn/ui, Recharts |
| Backend | NestJS, express-session, Socket.io |
| AI/ML | LangGraph, LangChain, OpenAI GPT-4o-mini |
| Database | PostgreSQL 16, Prisma 5 |
| Cache / Rate Limit | Redis 7, @nestjs/throttler |
| Build | Turborepo, pnpm workspaces |
| Testing | Jest, Vitest, fast-check, Playwright |
| CI | Husky + lint-staged + commitlint |
