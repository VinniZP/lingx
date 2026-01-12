/**
 * Dashboard Routes
 *
 * Provides aggregate statistics for the user's dashboard.
 */
import { dashboardStatsResponseSchema } from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { GetDashboardStatsQuery } from '../modules/dashboard/index.js';

/**
 * Dashboard routes plugin
 */
const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/dashboard/stats
   *
   * Get aggregate statistics for the current user's dashboard.
   * Requires authentication.
   */
  app.get(
    '/api/dashboard/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get dashboard statistics for the current user',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        response: {
          200: dashboardStatsResponseSchema,
        },
      },
    },
    async (request) => {
      const stats = await fastify.queryBus.execute(new GetDashboardStatsQuery(request.user.userId));
      return stats;
    }
  );
};

export default dashboardRoutes;
