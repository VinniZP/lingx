/**
 * Activity Routes
 *
 * Provides activity feed endpoints for dashboard and project pages.
 * Per ADR-0005: Activity Tracking System
 *
 * Uses CQRS-lite pattern with QueryBus.
 * Authorization is handled by query handlers, keeping routes thin.
 */
import { activityChangesResponseSchema, activityListResponseSchema } from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// CQRS Queries
// Result types are inferred from queries - no explicit type needed
import { GetActivityChangesQuery, GetUserActivitiesQuery } from '../modules/activity/index.js';

const activityRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

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

      // Result type is inferred from GetUserActivitiesQuery
      return await fastify.queryBus.execute(
        new GetUserActivitiesQuery(request.user.userId, { limit, cursor })
      );
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

      // Result type is inferred from GetActivityChangesQuery
      // Authorization is handled by the query handler
      return await fastify.queryBus.execute(
        new GetActivityChangesQuery(id, request.user.userId, { limit, cursor })
      );
    }
  );
};

export default activityRoutes;
