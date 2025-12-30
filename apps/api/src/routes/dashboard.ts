/**
 * Dashboard Routes
 *
 * Provides aggregate statistics for the user's dashboard.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { dashboardStatsResponseSchema } from '@localeflow/shared';
import { DashboardService } from '../services/dashboard.service.js';

/**
 * Dashboard routes plugin
 */
const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const dashboardService = new DashboardService(fastify.prisma);

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
      const stats = await dashboardService.getStats(request.user.userId);
      return stats;
    }
  );
};

export default dashboardRoutes;
