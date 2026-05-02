# Folder Structure Rules

## Monorepo Root

```
banking-agent-crm/
├── .rules/                    # Coding rules — never add application code here
├── .skills/                   # Skill templates — never add application code here
├── apps/
│   ├── web/                   # Next.js 15 App Router frontend
│   └── api/                   # NestJS backend
├── packages/
│   ├── config/                # Shared ESLint, TypeScript, Prettier configs
│   ├── types/                 # Shared TypeScript types and interfaces ONLY
│   ├── database/              # Prisma schema, client, and seed data
│   ├── ai/                    # LangGraph graph, scoring engine, RAG, nodes
│   └── ui/                    # Shared React UI components
├── docker-compose.yml
├── docker-compose.override.yml
├── turbo.json
├── pnpm-workspace.yaml
├── DECISIONS.md
└── README.md
```

## Enforcement Rules

1. **Never create top-level folders** other than `apps/`, `packages/`, `.rules/`, `.skills/`
2. **Never add new apps** without a corresponding Dockerfile and `.env.example`
3. **Never add new packages** without updating `pnpm-workspace.yaml` (it auto-picks via glob)
4. **Never co-locate types** in app code — all shared types go in `packages/types/src/`

## apps/web Internal Structure

```
apps/web/src/
├── app/                       # Next.js App Router pages and layouts
│   ├── (auth)/login/          # Auth route group — no navbar
│   ├── dashboard/             # Main dashboard
│   ├── history/               # Analysis history + [id] replay
│   └── customer/[id]/         # Customer detail
├── components/
│   ├── dashboard/             # Dashboard-specific components
│   ├── customers/             # Customer card, filters, table
│   ├── workflow/              # Workflow step indicators
│   ├── messages/              # WhatsApp message card, editor
│   ├── history/               # Timeline components
│   ├── auth/                  # Login form
│   └── ui/                   # shadcn/ui generated components (do not hand-edit)
├── hooks/                     # Custom React hooks (data fetching + WS)
├── lib/                       # Utilities, API client, socket client, constants
├── providers/                 # Context providers (session, socket, query)
└── types/                     # App-local type extensions only (e.g., session.d.ts)
```

## apps/api Internal Structure

```
apps/api/src/
├── modules/
│   ├── auth/                  # Session auth, guards, decorators
│   ├── tenant/                # Tenant CRUD (admin only)
│   ├── customer/              # Customer list + detail (repository pattern)
│   ├── transaction/           # Transaction service + repository (no controller)
│   ├── crm/                   # CRM run, history, WebSocket gateway
│   └── ai/                    # AI service wrapping packages/ai graph
├── common/
│   ├── interceptors/          # PII masking, tenant context
│   ├── middleware/            # Tenant resolution, session
│   ├── filters/               # Global HTTP exception filter
│   ├── pipes/                 # Validation pipe
│   ├── guards/                # Tenant isolation guard
│   └── decorators/            # @CurrentUser, @Roles, @Public
├── config/                    # App config, session config, rate-limit config
├── database/                  # PrismaService (singleton wrapper)
└── main.ts
```

## packages/ai Internal Structure

```
packages/ai/src/
├── graph/
│   ├── state.ts               # CrmAgentAnnotation (LangGraph state)
│   ├── checkpointer.ts        # PostgresSaver setup
│   └── crm.graph.ts           # StateGraph compile
├── nodes/                     # One file per LangGraph node
├── scoring/
│   ├── engine.ts              # Scoring orchestrator
│   ├── rules/                 # One rule file per scoring dimension
│   └── sigmoid.ts             # Conversion probability calculator
├── rag/
│   ├── retriever.ts           # Template retrieval logic
│   └── templates/             # Markdown product templates
└── utils/
    ├── transaction-aggregator.ts
    └── filter-parser.ts
```

## packages/database Internal Structure

```
packages/database/
├── prisma/
│   ├── schema.prisma          # Single source of truth for all models
│   ├── migrations/            # Auto-generated — never hand-edit
│   └── seed/
│       ├── index.ts           # Seed orchestrator
│       ├── data/              # Static scenario definitions, names, cities
│       └── generators/        # Customer and transaction generators
└── src/
    ├── client.ts              # PrismaClient singleton
    └── index.ts               # Public exports
```
