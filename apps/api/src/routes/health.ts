import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { GetHealthQuery } from '../modules/health/index.js';

// Response schemas
const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  version: z.string(),
});

const detailedHealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  version: z.string(),
  checks: z.object({
    database: z.object({
      status: z.string(),
      latencyMs: z.number(),
    }),
  }),
});

/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring the application's health status.
 * Uses CQRS-lite pattern - routes dispatch to query bus.
 *
 * - /health: Basic health check for load balancer probes
 * - /health/detailed: Comprehensive health check including database status
 */
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Basic health check
  app.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (_request, _reply) => {
      const result = await fastify.queryBus.execute(new GetHealthQuery(false));

      return {
        status: result.status === 'healthy' ? 'ok' : 'degraded',
        timestamp: result.timestamp.toISOString(),
        version: process.env.npm_package_version || '0.0.0',
      };
    }
  );

  // Detailed health check with database
  app.get(
    '/health/detailed',
    {
      schema: {
        description: 'Detailed health check with database status',
        tags: ['Health'],
        response: {
          200: detailedHealthResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const start = Date.now();
      try {
        const result = await fastify.queryBus.execute(new GetHealthQuery(true));

        // Map domain terminology to API response format
        const dbStatus = result.details?.database;
        const checks = {
          database: {
            status: dbStatus?.status === 'up' ? 'ok' : 'error',
            latencyMs: dbStatus?.latencyMs ?? Date.now() - start,
          },
        };

        return {
          status: result.status === 'healthy' ? 'ok' : 'degraded',
          timestamp: result.timestamp.toISOString(),
          version: process.env.npm_package_version || '0.0.0',
          checks,
        };
      } catch (error) {
        // Infrastructure failure - health check itself is broken
        request.log.error({ err: error }, 'Health check query execution failed');
        return {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '0.0.0',
          checks: {
            database: { status: 'error', latencyMs: Date.now() - start },
          },
        };
      }
    }
  );
};

export default healthRoutes;
