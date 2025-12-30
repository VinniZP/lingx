/**
 * Activity Routes
 *
 * Provides activity feed endpoints for dashboard and project pages.
 * Per ADR-0005: Activity Tracking System
 */
import { FastifyPluginAsync } from 'fastify';
import { ActivityService } from '../services/activity.service.js';
import { NotFoundError, ForbiddenError } from '../plugins/error-handler.js';

const activityRoutes: FastifyPluginAsync = async (fastify) => {
  const activityService = new ActivityService(fastify.prisma);

  /**
   * GET /api/activity
   *
   * Get recent activities for the current user across all their projects.
   * Used by the dashboard activity feed.
   */
  fastify.get(
    '/api/activity',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get user activities across all projects',
        tags: ['Activity'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
            cursor: { type: 'string', description: 'ISO date cursor for pagination' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              activities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    projectId: { type: 'string' },
                    projectName: { type: 'string' },
                    branchId: { type: ['string', 'null'] },
                    branchName: { type: 'string' },
                    userId: { type: 'string' },
                    userName: { type: 'string' },
                    type: { type: 'string' },
                    count: { type: 'number' },
                    metadata: { type: 'object' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              nextCursor: { type: 'string' },
            },
          },
        },
      },
    },
    async (request) => {
      const { limit, cursor } = request.query as { limit?: number; cursor?: string };
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
  fastify.get(
    '/api/activity/:id/changes',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get full change history for an activity',
        tags: ['Activity'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            cursor: { type: 'string', description: 'ISO date cursor for pagination' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              changes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    activityId: { type: 'string' },
                    entityType: { type: 'string' },
                    entityId: { type: 'string' },
                    keyName: { type: 'string' },
                    language: { type: 'string' },
                    oldValue: { type: 'string' },
                    newValue: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              nextCursor: { type: 'string' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { limit, cursor } = request.query as { limit?: number; cursor?: string };

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
