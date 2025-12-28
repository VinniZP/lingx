# Multi-stage Dockerfile for Fastify API with Prisma 7
# Optimized for production deployment

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /app

# Copy package files for dependency installation
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install all dependencies (including dev for building)
RUN pnpm install --frozen-lockfile --filter=@localeflow/api...

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules

# Copy all source code
COPY . .

# Build shared packages first
RUN pnpm --filter=@localeflow/shared build

# Generate Prisma client
RUN pnpm --filter=@localeflow/api db:generate

# Build the API
RUN pnpm --filter=@localeflow/api build

# Stage 3: Production
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 localeflow

# Copy built artifacts and necessary files
COPY --from=builder --chown=localeflow:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=localeflow:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=localeflow:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=localeflow:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=localeflow:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=localeflow:nodejs /app/package.json ./package.json

# Copy startup script
COPY --chown=localeflow:nodejs apps/api/docker-entrypoint.sh ./apps/api/

# Make entrypoint executable
RUN chmod +x ./apps/api/docker-entrypoint.sh

USER localeflow

EXPOSE 3001

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

WORKDIR /app/apps/api

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
