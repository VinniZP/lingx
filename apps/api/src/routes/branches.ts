/**
 * Branch Routes
 *
 * Handles branch CRUD operations and diff computation.
 * Per Design Doc: AC-WEB-012, AC-WEB-013, AC-WEB-014
 *
 * Uses CQRS-lite pattern with CommandBus and QueryBus.
 * Authorization is handled by command/query handlers, keeping routes thin.
 */
import {
  branchDiffResponseSchema,
  branchListResponseSchema,
  branchWithSpaceSchema,
  createBranchSchema,
  mergeRequestSchema,
  mergeResponseSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toBranchDtoList, toBranchWithSpaceDto } from '../dto/index.js';

// CQRS Commands and Queries
import {
  ComputeDiffQuery,
  CreateBranchCommand,
  DeleteBranchCommand,
  GetBranchQuery,
  ListBranchesQuery,
  MergeBranchesCommand,
} from '../modules/branch/index.js';

const branchRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/spaces/:spaceId/branches - List branches for a space
   */
  app.get(
    '/api/spaces/:spaceId/branches',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all branches for a space',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          spaceId: z.string(),
        }),
        response: {
          200: branchListResponseSchema,
        },
      },
    },
    async (request) => {
      const branches = await fastify.queryBus.execute(
        new ListBranchesQuery(request.params.spaceId, request.user.userId)
      );
      return { branches: toBranchDtoList(branches) };
    }
  );

  /**
   * POST /api/spaces/:spaceId/branches - Create new branch (copy-on-write)
   */
  app.post(
    '/api/spaces/:spaceId/branches',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new branch with copy-on-write from source branch',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          spaceId: z.string(),
        }),
        body: createBranchSchema,
        response: {
          201: branchWithSpaceSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, fromBranchId } = request.body;

      const branch = await fastify.commandBus.execute(
        new CreateBranchCommand(name, request.params.spaceId, fromBranchId, request.user.userId)
      );

      return reply.status(201).send(toBranchWithSpaceDto(branch));
    }
  );

  /**
   * GET /api/branches/:id - Get branch details
   */
  app.get(
    '/api/branches/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get branch by ID with details',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: branchWithSpaceSchema,
        },
      },
    },
    async (request) => {
      const branch = await fastify.queryBus.execute(
        new GetBranchQuery(request.params.id, request.user.userId)
      );
      return toBranchWithSpaceDto(branch);
    }
  );

  /**
   * DELETE /api/branches/:id - Delete branch
   */
  app.delete(
    '/api/branches/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete branch (cannot delete default branch)',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new DeleteBranchCommand(request.params.id, request.user.userId)
      );
      return reply.status(204).send();
    }
  );

  /**
   * GET /api/branches/:id/diff/:targetId - Compare two branches
   *
   * Per Design Doc: AC-WEB-014 - Diff shows added, modified, deleted keys
   * Returns categorized changes between source and target branches.
   */
  app.get(
    '/api/branches/:id/diff/:targetId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Compare two branches and show differences',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
          targetId: z.string(),
        }),
        response: {
          200: branchDiffResponseSchema,
        },
      },
    },
    async (request) => {
      return fastify.queryBus.execute(
        new ComputeDiffQuery(request.params.id, request.params.targetId, request.user.userId)
      );
    }
  );

  /**
   * POST /api/branches/:id/merge - Merge source branch into target
   *
   * Per Design Doc: AC-WEB-015 - Merge with conflicts and resolution
   * Merges changes from source branch into target branch.
   * Returns conflicts if any exist and no resolutions are provided.
   */
  app.post(
    '/api/branches/:id/merge',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Merge source branch into target branch',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: mergeRequestSchema,
        response: {
          200: mergeResponseSchema,
        },
      },
    },
    async (request) => {
      const { targetBranchId, resolutions } = request.body;

      return fastify.commandBus.execute(
        new MergeBranchesCommand(
          request.params.id,
          targetBranchId,
          resolutions,
          request.user.userId
        )
      );
    }
  );
};

export default branchRoutes;
