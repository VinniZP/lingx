import { FastifyPluginAsync } from 'fastify';

/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring the application's health status.
 * - /health: Basic health check for load balancer probes
 * - /health/detailed: Comprehensive health check including database status
 */
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Basic health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
          },
        },
      },
    },
  }, async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.0',
    };
  });

  // Detailed health check with database
  fastify.get('/health/detailed', {
    schema: {
      description: 'Detailed health check with database status',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    latencyMs: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, _reply) => {
    const checks = {
      database: { status: 'unknown', latencyMs: 0 },
    };

    // Check database
    const dbStart = Date.now();
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'ok',
        latencyMs: Date.now() - dbStart,
      };
    } catch (error) {
      request.log.error({ err: error }, 'Database health check failed');
      checks.database = {
        status: 'error',
        latencyMs: Date.now() - dbStart,
      };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.0',
      checks,
    };
  });
};

export default healthRoutes;
