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
RUN pnpm --filter=@lingx/shared build
RUN pnpm --filter=@lingx/api db:generate
RUN pnpm --filter=@lingx/api build

# Stage 2: Deploy (use pnpm deploy to resolve workspace dependencies)
FROM node:20-alpine AS deployer
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /app

COPY --from=builder /app ./

# pnpm deploy creates a standalone package with workspace deps resolved
RUN pnpm --filter=@lingx/api deploy --prod --legacy /deploy

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 lingx

# Copy deployed package (includes node_modules with workspace deps resolved)
COPY --from=deployer /deploy ./

# Copy Docker-specific Prisma config
COPY apps/api/prisma.config.docker.mjs ./prisma.config.mjs

# Copy entrypoint
COPY apps/api/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Generate Prisma client in production node_modules
RUN npx prisma generate

# Set ownership
RUN chown -R lingx:nodejs /app

USER lingx

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
