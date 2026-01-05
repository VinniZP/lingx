/**
 * Environment Routes
 *
 * Handles environment CRUD operations with branch pointer management.
 * Per Design Doc: AC-WEB-017, AC-WEB-018, AC-WEB-019
 *
 * Uses CQRS-lite pattern with CommandBus and QueryBus.
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
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';
import { ProjectService } from '../services/project.service.js';

// CQRS Commands and Queries
import {
  CreateEnvironmentCommand,
  DeleteEnvironmentCommand,
  GetEnvironmentQuery,
  ListEnvironmentsQuery,
  SwitchBranchCommand,
  UpdateEnvironmentCommand,
  type EnvironmentWithBranch,
} from '../modules/environment/index.js';

const environmentRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const projectService = new ProjectService(fastify.prisma);

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
    async (request, _reply) => {
      const { projectId } = request.params;

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      const isMember = await projectService.checkMembership(project.id, request.user.userId);
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const environments = await fastify.queryBus.execute<EnvironmentWithBranch[]>(
        new ListEnvironmentsQuery(project.id)
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
      const { projectId } = request.params;
      const { name, slug, branchId } = request.body;

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check manager role
      const role = await projectService.getMemberRole(project.id, request.user.userId);
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      const environment = await fastify.commandBus.execute<EnvironmentWithBranch>(
        new CreateEnvironmentCommand(name, slug, project.id, branchId, request.user.userId)
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
    async (request, _reply) => {
      const { id } = request.params;

      const environment = await fastify.queryBus.execute<EnvironmentWithBranch | null>(
        new GetEnvironmentQuery(id)
      );
      if (!environment) {
        throw new NotFoundError('Environment');
      }

      const isMember = await projectService.checkMembership(
        environment.projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

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
    async (request, _reply) => {
      const { id } = request.params;
      const input = request.body;

      const environment = await fastify.queryBus.execute<EnvironmentWithBranch | null>(
        new GetEnvironmentQuery(id)
      );
      if (!environment) {
        throw new NotFoundError('Environment');
      }

      // Check manager role
      const role = await projectService.getMemberRole(environment.projectId, request.user.userId);
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      const updated = await fastify.commandBus.execute<EnvironmentWithBranch>(
        new UpdateEnvironmentCommand(id, input.name)
      );
      return toEnvironmentDto(updated);
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
    async (request, _reply) => {
      const { id } = request.params;
      const { branchId } = request.body;

      const environment = await fastify.queryBus.execute<EnvironmentWithBranch | null>(
        new GetEnvironmentQuery(id)
      );
      if (!environment) {
        throw new NotFoundError('Environment');
      }

      // Check manager role
      const role = await projectService.getMemberRole(environment.projectId, request.user.userId);
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      const result = await fastify.commandBus.execute<EnvironmentWithBranch>(
        new SwitchBranchCommand(id, branchId, request.user.userId)
      );

      return toEnvironmentDto(result);
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
      const { id } = request.params;

      const environment = await fastify.queryBus.execute<EnvironmentWithBranch | null>(
        new GetEnvironmentQuery(id)
      );
      if (!environment) {
        throw new NotFoundError('Environment');
      }

      // Check manager role
      const role = await projectService.getMemberRole(environment.projectId, request.user.userId);
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      await fastify.commandBus.execute(new DeleteEnvironmentCommand(id, request.user.userId));

      return reply.status(204).send();
    }
  );
};

export default environmentRoutes;
