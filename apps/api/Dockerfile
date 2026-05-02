FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── deps ────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json   ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY packages/ai/package.json      ./packages/ai/
COPY packages/ui/package.json      ./packages/ui/
COPY apps/api/package.json         ./apps/api/
RUN pnpm install --frozen-lockfile

# ── builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules  ./packages/types/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/ai/node_modules    ./packages/ai/node_modules
COPY --from=deps /app/packages/ui/node_modules    ./packages/ui/node_modules
COPY --from=deps /app/apps/api/node_modules       ./apps/api/node_modules
COPY . .
RUN pnpm --filter @banking-crm/database db:generate
RUN pnpm --filter @banking-crm/api build

# ── runner ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app/apps/api/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules  ./node_modules
COPY --from=builder --chown=app:app /app/packages      ./packages

USER app

EXPOSE 3001
CMD ["node", "dist/apps/api/src/main.js"]
