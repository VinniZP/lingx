/**
 * Environment Routes
 *
 * Handles environment CRUD operations with branch pointer management.
 * Per Design Doc: AC-WEB-017, AC-WEB-018, AC-WEB-019
 */
import { FastifyPluginAsync } from 'fastify';
import { EnvironmentService } from '../services/environment.service.js';
import { ProjectService } from '../services/project.service.js';
import {
  createEnvironmentSchema,
  updateEnvironmentSchema,
  switchBranchSchema,
  environmentListSchema,
  environmentResponseSchema,
} from '../schemas/environment.schema.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const environmentRoutes: FastifyPluginAsync = async (fastify) => {
  const environmentService = new EnvironmentService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

  /**
   * GET /api/projects/:projectId/environments - List environments
   */
  fastify.get(
    '/api/projects/:projectId/environments',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all environments for a project',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
        },
        ...environmentListSchema,
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params as { projectId: string };

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const environments = await environmentService.findByProjectId(projectId);
      return { environments };
    }
  );

  /**
   * POST /api/projects/:projectId/environments - Create environment
   */
  fastify.post(
    '/api/projects/:projectId/environments',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new environment',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
        },
        ...createEnvironmentSchema,
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { name, slug, branchId } = request.body as {
        name: string;
        slug: string;
        branchId: string;
      };

      // Check manager role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      const environment = await environmentService.create({
        name,
        slug,
        projectId,
        branchId,
      });

      return reply.status(201).send(environment);
    }
  );

  /**
   * GET /api/environments/:id - Get environment details
   */
  fastify.get(
    '/api/environments/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get environment by ID',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: environmentResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };

      const environment = await environmentService.findById(id);
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

      return environment;
    }
  );

  /**
   * PUT /api/environments/:id - Update environment
   */
  fastify.put(
    '/api/environments/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update environment',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        ...updateEnvironmentSchema,
        response: {
          200: environmentResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };
      const input = request.body as { name?: string };

      const environment = await environmentService.findById(id);
      if (!environment) {
        throw new NotFoundError('Environment');
      }

      // Check manager role
      const role = await projectService.getMemberRole(
        environment.projectId,
        request.user.userId
      );
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      return environmentService.update(id, input);
    }
  );

  /**
   * PUT /api/environments/:id/branch - Switch branch pointer
   */
  fastify.put(
    '/api/environments/:id/branch',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Switch environment branch pointer',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        ...switchBranchSchema,
        response: {
          200: environmentResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };
      const { branchId } = request.body as { branchId: string };

      const environment = await environmentService.findById(id);
      if (!environment) {
        throw new NotFoundError('Environment');
      }

      // Check manager role
      const role = await projectService.getMemberRole(
        environment.projectId,
        request.user.userId
      );
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      return environmentService.switchBranch(id, branchId);
    }
  );

  /**
   * DELETE /api/environments/:id - Delete environment
   */
  fastify.delete(
    '/api/environments/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete environment',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const environment = await environmentService.findById(id);
      if (!environment) {
        throw new NotFoundError('Environment');
      }

      // Check manager role
      const role = await projectService.getMemberRole(
        environment.projectId,
        request.user.userId
      );
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      await environmentService.delete(id);
      return reply.status(204).send();
    }
  );
};

export default environmentRoutes;
