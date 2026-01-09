/**
 * Project Routes
 *
 * Thin HTTP layer for project operations.
 * Routes validate input, dispatch to CQRS buses, and return DTOs.
 * Per Design Doc: AC-WEB-001, AC-WEB-002, AC-WEB-003
 */
import {
  activityListResponseSchema,
  createProjectSchema,
  projectListResponseSchema,
  projectResponseSchema,
  projectStatsDetailSchema,
  projectTreeResponseSchema,
  updateProjectSchema,
} from '@lingx/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toProjectDto, toProjectTreeDto, toProjectWithStatsDtoList } from '../dto/index.js';
import {
  CreateProjectCommand,
  DeleteProjectCommand,
  GetProjectActivityQuery,
  GetProjectQuery,
  GetProjectStatsQuery,
  GetProjectTreeQuery,
  ListProjectsQuery,
  UpdateProjectCommand,
} from '../modules/project/index.js';

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/projects - List user's projects with stats
   */
  app.get(
    '/api/projects',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all projects for the authenticated user with statistics',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        response: {
          200: projectListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const result = await fastify.queryBus.execute(new ListProjectsQuery(request.user.userId));
      return { projects: toProjectWithStatsDtoList(result) };
    }
  );

  /**
   * POST /api/projects - Create new project
   */
  app.post(
    '/api/projects',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new project',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }],
        body: createProjectSchema,
        response: {
          201: projectResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, slug, description, languageCodes, defaultLanguage } = request.body;

      const project = await fastify.commandBus.execute(
        new CreateProjectCommand(
          name,
          slug,
          description,
          languageCodes,
          defaultLanguage,
          request.user.userId
        )
      );

      // Creator is always the owner
      return reply.status(201).send(toProjectDto(project, 'OWNER'));
    }
  );

  /**
   * GET /api/projects/:id - Get project details
   */
  app.get(
    '/api/projects/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get project by ID',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: projectResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { project, role } = await fastify.queryBus.execute(
        new GetProjectQuery(request.params.id, request.user.userId)
      );
      return toProjectDto(project, role);
    }
  );

  /**
   * PUT /api/projects/:id - Update project
   */
  app.put(
    '/api/projects/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update project',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: updateProjectSchema,
        response: {
          200: projectResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const project = await fastify.commandBus.execute(
        new UpdateProjectCommand(request.params.id, request.user.userId, request.body)
      );

      // Get user's role for the response DTO
      // Since update requires MANAGER or OWNER, we can safely use the role from authorization
      const { role } = await fastify.queryBus.execute(
        new GetProjectQuery(project.id, request.user.userId)
      );

      return toProjectDto(project, role);
    }
  );

  /**
   * DELETE /api/projects/:id - Delete project
   */
  app.delete(
    '/api/projects/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete project',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new DeleteProjectCommand(request.params.id, request.user.userId)
      );
      return reply.status(204).send();
    }
  );

  /**
   * GET /api/projects/:id/stats - Get project statistics
   */
  app.get(
    '/api/projects/:id/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get project statistics',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: projectStatsDetailSchema,
        },
      },
    },
    async (request, _reply) => {
      return fastify.queryBus.execute(
        new GetProjectStatsQuery(request.params.id, request.user.userId)
      );
    }
  );

  /**
   * GET /api/projects/:id/tree - Get project navigation tree
   *
   * Returns hierarchical data for sidebar tree navigation:
   * Project -> Spaces -> Branches with key counts
   */
  app.get(
    '/api/projects/:id/tree',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get project navigation tree for sidebar',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: projectTreeResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const tree = await fastify.queryBus.execute(
        new GetProjectTreeQuery(request.params.id, request.user.userId)
      );
      return toProjectTreeDto(tree);
    }
  );

  /**
   * GET /api/projects/:id/activity - Get project activity feed
   *
   * Returns recent activities for the project.
   * Used by the project details page activity feed.
   */
  app.get(
    '/api/projects/:id/activity',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get project activity feed',
        tags: ['Projects', 'Activity'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          limit: z.coerce.number().min(1).max(50).default(10).optional(),
          cursor: z.string().optional(),
        }),
        response: {
          200: activityListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { limit, cursor } = request.query;
      return fastify.queryBus.execute(
        new GetProjectActivityQuery(request.params.id, request.user.userId, limit, cursor)
      );
    }
  );
};

export default projectRoutes;
