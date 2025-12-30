/**
 * Activity Routes
 *
 * Provides activity feed endpoints for dashboard and project pages.
 * Per ADR-0005: Activity Tracking System
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  activityListResponseSchema,
  activityChangesResponseSchema,
} from '@localeflow/shared';
import { ActivityService } from '../services/activity.service.js';
import { NotFoundError, ForbiddenError } from '../plugins/error-handler.js';

const activityRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const activityService = new ActivityService(fastify.prisma);

  /**
   * GET /api/activity
   *
   * Get recent activities for the current user across all their projects.
   * Used by the dashboard activity feed.
   */
  app.get(
    '/api/activity',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get user activities across all projects',
        tags: ['Activity'],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          limit: z.coerce.number().min(1).max(50).default(10).optional(),
          cursor: z.string().optional(),
        }),
        response: {
          200: activityListResponseSchema,
        },
      },
    },
    async (request) => {
      const { limit, cursor } = request.query;
      return await activityService.getUserActivities(request.user.userId, {
        limit,
        cursor,
      });
    }
  );

  /**
   * GET /api/activity/:id/changes
   *
   * Get full audit trail for a specific activity.
   * Used for the "View all changes" modal.
   */
  app.get(
    '/api/activity/:id/changes',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get full change history for an activity',
        tags: ['Activity'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(20).optional(),
          cursor: z.string().optional(),
        }),
        response: {
          200: activityChangesResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { limit, cursor } = request.query;

      // Verify user has access to this activity
      const activity = await fastify.prisma.activity.findUnique({
        where: { id },
        select: { projectId: true },
      });

      if (!activity) {
        throw new NotFoundError('Activity');
      }

      // Check if user is a member of the project
      const membership = await fastify.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: activity.projectId,
            userId: request.user.userId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('Not a member of this project');
      }

      return await activityService.getActivityChanges(id, { limit, cursor });
    }
  );
};

export default activityRoutes;
