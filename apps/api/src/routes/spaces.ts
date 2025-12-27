/**
 * Space Routes
 *
 * Handles space CRUD operations.
 * Per Design Doc: AC-WEB-004, AC-WEB-005, AC-WEB-006
 */
import { FastifyPluginAsync } from 'fastify';
import { SpaceService } from '../services/space.service.js';
import { ProjectService } from '../services/project.service.js';
import {
  createSpaceSchema,
  updateSpaceSchema,
  spaceListSchema,
  spaceResponseSchema,
  spaceWithBranchesSchema,
  spaceStatsSchema,
} from '../schemas/space.schema.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const spaceRoutes: FastifyPluginAsync = async (fastify) => {
  const spaceService = new SpaceService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

  /**
   * GET /api/projects/:projectId/spaces - List spaces for a project
   */
  fastify.get(
    '/api/projects/:projectId/spaces',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all spaces for a project',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
        },
        ...spaceListSchema,
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params as { projectId: string };

      // Check membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const spaces = await spaceService.findByProjectId(projectId);
      return { spaces };
    }
  );

  /**
   * POST /api/projects/:projectId/spaces - Create new space
   */
  fastify.post(
    '/api/projects/:projectId/spaces',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new space in a project (auto-creates main branch)',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
        },
        ...createSpaceSchema,
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { name, slug, description } = request.body as {
        name: string;
        slug: string;
        description?: string;
      };

      // Check membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const space = await spaceService.create({
        name,
        slug,
        description,
        projectId,
      });

      return reply.status(201).send(space);
    }
  );

  /**
   * GET /api/spaces/:id - Get space details with branches
   */
  fastify.get(
    '/api/spaces/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get space by ID with branches',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: spaceWithBranchesSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };

      const space = await spaceService.findById(id);
      if (!space) {
        throw new NotFoundError('Space');
      }

      // Check membership via project
      const isMember = await projectService.checkMembership(
        space.projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      return space;
    }
  );

  /**
   * PUT /api/spaces/:id - Update space
   */
  fastify.put(
    '/api/spaces/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update space',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        ...updateSpaceSchema,
        response: {
          200: spaceResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };
      const input = request.body as {
        name?: string;
        description?: string;
      };

      const projectId = await spaceService.getProjectIdBySpaceId(id);
      if (!projectId) {
        throw new NotFoundError('Space');
      }

      // Check membership and role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new ForbiddenError('Not a member of this project');
      }

      const space = await spaceService.update(id, input);
      return space;
    }
  );

  /**
   * DELETE /api/spaces/:id - Delete space
   */
  fastify.delete(
    '/api/spaces/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete space',
        tags: ['Spaces'],
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

      const projectId = await spaceService.getProjectIdBySpaceId(id);
      if (!projectId) {
        throw new NotFoundError('Space');
      }

      // Check manager role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      await spaceService.delete(id);
      return reply.status(204).send();
    }
  );

  /**
   * GET /api/spaces/:id/stats - Get space statistics
   */
  fastify.get(
    '/api/spaces/:id/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get space statistics',
        tags: ['Spaces'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: spaceStatsSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };

      const projectId = await spaceService.getProjectIdBySpaceId(id);
      if (!projectId) {
        throw new NotFoundError('Space');
      }

      // Check membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const stats = await spaceService.getStats(id);
      return stats;
    }
  );
};

export default spaceRoutes;
