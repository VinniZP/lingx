/**
 * Project Routes
 *
 * Handles project CRUD operations.
 * Per Design Doc: AC-WEB-001, AC-WEB-002, AC-WEB-003
 */
import { FastifyPluginAsync } from 'fastify';
import { ProjectService } from '../services/project.service.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectListSchema,
  projectResponseSchema,
  projectStatsSchema,
} from '../schemas/project.schema.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const projectService = new ProjectService(fastify.prisma);

  /**
   * GET /api/projects - List user's projects
   */
  fastify.get(
    '/api/projects',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all projects for the authenticated user',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        ...projectListSchema,
      },
    },
    async (request, _reply) => {
      const projects = await projectService.findByUserId(request.user.userId);
      return { projects };
    }
  );

  /**
   * POST /api/projects - Create new project
   */
  fastify.post(
    '/api/projects',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new project',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }],
        ...createProjectSchema,
      },
    },
    async (request, reply) => {
      const { name, slug, description, languageCodes, defaultLanguage } =
        request.body as {
          name: string;
          slug: string;
          description?: string;
          languageCodes: string[];
          defaultLanguage: string;
        };

      const project = await projectService.create({
        name,
        slug,
        description,
        languageCodes,
        defaultLanguage,
        userId: request.user.userId,
      });

      return reply.status(201).send(project);
    }
  );

  /**
   * GET /api/projects/:id - Get project details
   */
  fastify.get(
    '/api/projects/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get project by ID',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: projectResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };

      // Check membership
      const isMember = await projectService.checkMembership(
        id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const project = await projectService.findById(id);
      if (!project) {
        throw new NotFoundError('Project');
      }

      return project;
    }
  );

  /**
   * PUT /api/projects/:id - Update project
   */
  fastify.put(
    '/api/projects/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update project',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        ...updateProjectSchema,
        response: {
          200: projectResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };
      const input = request.body as {
        name?: string;
        description?: string;
        languageCodes?: string[];
        defaultLanguage?: string;
      };

      // Check membership and role
      const role = await projectService.getMemberRole(id, request.user.userId);
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      const project = await projectService.update(id, input);
      return project;
    }
  );

  /**
   * DELETE /api/projects/:id - Delete project
   */
  fastify.delete(
    '/api/projects/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete project',
        tags: ['Projects'],
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

      // Check ownership
      const role = await projectService.getMemberRole(id, request.user.userId);
      if (role !== 'OWNER') {
        throw new ForbiddenError('Only project owner can delete');
      }

      await projectService.delete(id);
      return reply.status(204).send();
    }
  );

  /**
   * GET /api/projects/:id/stats - Get project statistics
   */
  fastify.get(
    '/api/projects/:id/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get project statistics',
        tags: ['Projects'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: projectStatsSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };

      // Check membership
      const isMember = await projectService.checkMembership(
        id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const stats = await projectService.getStats(id);
      return stats;
    }
  );
};

export default projectRoutes;
