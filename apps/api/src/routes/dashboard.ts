/**
 * Dashboard Routes
 *
 * Provides aggregate statistics for the user's dashboard.
 */
import { FastifyPluginAsync } from 'fastify';
import { DashboardService } from '../services/dashboard.service.js';

/**
 * Dashboard routes plugin
 */
const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  const dashboardService = new DashboardService(fastify.prisma);

  /**
   * GET /api/dashboard/stats
   *
   * Get aggregate statistics for the current user's dashboard.
   * Requires authentication.
   */
  fastify.get(
    '/api/dashboard/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get dashboard statistics for the current user',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              totalProjects: { type: 'number', description: 'Total projects the user has access to' },
              totalKeys: { type: 'number', description: 'Total translation keys across all projects' },
              totalLanguages: { type: 'number', description: 'Total unique languages' },
              completionRate: { type: 'number', description: 'Overall completion rate (0-1)' },
              translatedKeys: { type: 'number', description: 'Keys with at least one translation' },
              totalTranslations: { type: 'number', description: 'Total non-empty translations' },
            },
          },
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
