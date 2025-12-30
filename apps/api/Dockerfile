# Multi-stage Dockerfile for Fastify API with Prisma 7

# Stage 1: Builder (build TypeScript, generate Prisma client)
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /app

# Copy workspace files for dependency resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build shared packages and API
RUN pnpm --filter=@localeflow/shared build
RUN pnpm --filter=@localeflow/api db:generate
RUN pnpm --filter=@localeflow/api build

# Stage 2: Production
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 localeflow

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

# Remove devDependencies from package.json (contains workspace:* protocol)
RUN node -e "const p=require('./package.json'); delete p.devDependencies; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2));"

# Copy Docker-specific Prisma config (simple JS, no imports)
COPY apps/api/prisma.config.docker.mjs ./prisma.config.mjs

# Copy entrypoint
COPY apps/api/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Install production dependencies with pnpm (shamefully-hoist creates flat structure)
RUN pnpm install --prod --shamefully-hoist

# Generate Prisma client in production node_modules
RUN pnpm exec prisma generate

# Set ownership
RUN chown -R localeflow:nodejs /app

USER localeflow

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
