/**
 * Space Routes
 *
 * Handles space CRUD operations.
 * Per Design Doc: AC-WEB-004, AC-WEB-005, AC-WEB-006
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createSpaceSchema,
  updateSpaceSchema,
  spaceListResponseSchema,
  spaceResponseSchema,
  spaceWithBranchesSchema,
  spaceStatsResponseSchema,
} from '@lingx/shared';
import { SpaceService } from '../services/space.service.js';
import { ProjectService } from '../services/project.service.js';
import {
  toSpaceDto,
  toSpaceDtoList,
  toSpaceWithBranchesDto,
} from '../dto/index.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const spaceRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const spaceService = new SpaceService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

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

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check membership using internal ID
      const isMember = await projectService.checkMembership(
        project.id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const spaces = await spaceService.findByProjectId(project.id);
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

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check membership using internal ID
      const isMember = await projectService.checkMembership(
        project.id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const space = await spaceService.create({
        name,
        slug,
        description,
        projectId: project.id,
      });

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
