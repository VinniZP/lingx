/**
 * Environment Routes
 *
 * Handles environment CRUD operations with branch pointer management.
 * Per Design Doc: AC-WEB-017, AC-WEB-018, AC-WEB-019
 *
 * Uses CQRS-lite pattern with CommandBus and QueryBus.
 * Authorization is handled by command/query handlers, keeping routes thin.
 */
import {
  createEnvironmentSchema,
  environmentListResponseSchema,
  environmentResponseSchema,
  switchBranchSchema,
  updateEnvironmentSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toEnvironmentDto, toEnvironmentDtoList } from '../dto/index.js';
import { NotFoundError } from '../plugins/error-handler.js';

// CQRS Commands and Queries
// Result types are now inferred from commands/queries - no explicit type needed
import {
  CreateEnvironmentCommand,
  DeleteEnvironmentCommand,
  GetEnvironmentQuery,
  ListEnvironmentsQuery,
  SwitchBranchCommand,
  UpdateEnvironmentCommand,
} from '../modules/environment/index.js';

const environmentRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * Resolve project ID from slug or ID parameter.
   * Routes accept both for flexibility.
   */
  async function resolveProjectId(idOrSlug: string): Promise<string> {
    // Try to find by slug first
    const project = await fastify.prisma.project.findFirst({
      where: {
        OR: [{ slug: idOrSlug }, { id: idOrSlug }],
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }

    return project.id;
  }

  /**
   * GET /api/projects/:projectId/environments - List environments
   */
  app.get(
    '/api/projects/:projectId/environments',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all environments for a project',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: environmentListResponseSchema,
        },
      },
    },
    async (request) => {
      const projectId = await resolveProjectId(request.params.projectId);

      // Result type is inferred from ListEnvironmentsQuery
      const environments = await fastify.queryBus.execute(
        new ListEnvironmentsQuery(projectId, request.user.userId)
      );

      return { environments: toEnvironmentDtoList(environments) };
    }
  );

  /**
   * POST /api/projects/:projectId/environments - Create environment
   */
  app.post(
    '/api/projects/:projectId/environments',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new environment',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: createEnvironmentSchema,
        response: {
          201: environmentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const projectId = await resolveProjectId(request.params.projectId);
      const { name, slug, branchId } = request.body;

      // Result type is inferred from CreateEnvironmentCommand
      const environment = await fastify.commandBus.execute(
        new CreateEnvironmentCommand(name, slug, projectId, branchId, request.user.userId)
      );

      return reply.status(201).send(toEnvironmentDto(environment));
    }
  );

  /**
   * GET /api/environments/:id - Get environment details
   */
  app.get(
    '/api/environments/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get environment by ID',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: environmentResponseSchema,
        },
      },
    },
    async (request) => {
      // Result type is inferred from GetEnvironmentQuery
      const environment = await fastify.queryBus.execute(
        new GetEnvironmentQuery(request.params.id, request.user.userId)
      );

      return toEnvironmentDto(environment);
    }
  );

  /**
   * PUT /api/environments/:id - Update environment
   */
  app.put(
    '/api/environments/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update environment',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: updateEnvironmentSchema,
        response: {
          200: environmentResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { name } = request.body;

      // Result type is inferred from UpdateEnvironmentCommand
      const environment = await fastify.commandBus.execute(
        new UpdateEnvironmentCommand(id, request.user.userId, name)
      );

      return toEnvironmentDto(environment);
    }
  );

  /**
   * PUT /api/environments/:id/branch - Switch branch pointer
   */
  app.put(
    '/api/environments/:id/branch',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Switch environment branch pointer',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: switchBranchSchema,
        response: {
          200: environmentResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { branchId } = request.body;

      // Result type is inferred from SwitchBranchCommand
      const environment = await fastify.commandBus.execute(
        new SwitchBranchCommand(id, branchId, request.user.userId)
      );

      return toEnvironmentDto(environment);
    }
  );

  /**
   * DELETE /api/environments/:id - Delete environment
   */
  app.delete(
    '/api/environments/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete environment',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await fastify.commandBus.execute(
        new DeleteEnvironmentCommand(request.params.id, request.user.userId)
      );

      return reply.status(204).send();
    }
  );
};

export default environmentRoutes;
