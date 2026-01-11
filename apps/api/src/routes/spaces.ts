/**
 * Space Routes
 *
 * Thin HTTP layer for space operations.
 * Routes validate input, dispatch to CQRS buses, and return DTOs.
 * Per Design Doc: AC-WEB-004, AC-WEB-005, AC-WEB-006
 */
import {
  createSpaceSchema,
  spaceListResponseSchema,
  spaceResponseSchema,
  spaceStatsResponseSchema,
  spaceWithBranchesSchema,
  updateSpaceSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toSpaceDto, toSpaceDtoList, toSpaceWithBranchesDto } from '../dto/index.js';
import { GetProjectQuery } from '../modules/project/index.js';
import {
  CreateSpaceCommand,
  DeleteSpaceCommand,
  GetSpaceQuery,
  GetSpaceStatsQuery,
  ListSpacesQuery,
  UpdateSpaceCommand,
} from '../modules/space/index.js';

const spaceRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/projects/:projectId/spaces - List spaces for a project
   */
  app.get(
    '/api/projects/:projectId/spaces',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all spaces for a project',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: spaceListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;

      // Use GetProjectQuery to resolve project by ID or slug and verify access
      const { project } = await fastify.queryBus.execute(
        new GetProjectQuery(projectId, request.user.userId)
      );

      const spaces = await fastify.queryBus.execute(
        new ListSpacesQuery(project.id, request.user.userId)
      );

      return { spaces: toSpaceDtoList(spaces) };
    }
  );

  /**
   * POST /api/projects/:projectId/spaces - Create new space
   */
  app.post(
    '/api/projects/:projectId/spaces',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new space in a project (auto-creates main branch)',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: createSpaceSchema,
        response: {
          201: spaceResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { name, slug, description } = request.body;

      // Use GetProjectQuery to resolve project by ID or slug and verify access
      const { project } = await fastify.queryBus.execute(
        new GetProjectQuery(projectId, request.user.userId)
      );

      const space = await fastify.commandBus.execute(
        new CreateSpaceCommand(project.id, name, slug, description, request.user.userId)
      );

      return reply.status(201).send(toSpaceDto(space));
    }
  );

  /**
   * GET /api/spaces/:id - Get space details with branches
   */
  app.get(
    '/api/spaces/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get space by ID with branches',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: spaceWithBranchesSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params;

      const space = await fastify.queryBus.execute(new GetSpaceQuery(id, request.user.userId));

      return toSpaceWithBranchesDto(space);
    }
  );

  /**
   * PUT /api/spaces/:id - Update space
   */
  app.put(
    '/api/spaces/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update space',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: updateSpaceSchema,
        response: {
          200: spaceResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params;
      const input = request.body;

      const space = await fastify.commandBus.execute(
        new UpdateSpaceCommand(id, request.user.userId, input)
      );

      return toSpaceDto(space);
    }
  );

  /**
   * DELETE /api/spaces/:id - Delete space
   */
  app.delete(
    '/api/spaces/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete space',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      await fastify.commandBus.execute(new DeleteSpaceCommand(id, request.user.userId));

      return reply.status(204).send();
    }
  );

  /**
   * GET /api/spaces/:id/stats - Get space statistics
   */
  app.get(
    '/api/spaces/:id/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get space statistics',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: spaceStatsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params;

      const stats = await fastify.queryBus.execute(new GetSpaceStatsQuery(id, request.user.userId));

      return stats;
    }
  );
};

export default spaceRoutes;
