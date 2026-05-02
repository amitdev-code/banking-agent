FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── deps ────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json   ./packages/config/
COPY packages/types/package.json    ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY packages/ui/package.json       ./packages/ui/
COPY apps/web/package.json          ./apps/web/
RUN pnpm install --frozen-lockfile

# ── builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules  ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules   ./packages/types/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/ui/node_modules      ./packages/ui/node_modules
COPY --from=deps /app/apps/web/node_modules         ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @banking-crm/database db:generate
RUN pnpm --filter @banking-crm/web build

# ── runner ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=app:app /app/apps/web/public           ./apps/web/public

USER app

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
