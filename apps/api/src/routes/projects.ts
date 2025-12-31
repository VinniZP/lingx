/**
 * Project Routes
 *
 * Handles project CRUD operations.
 * Per Design Doc: AC-WEB-001, AC-WEB-002, AC-WEB-003
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createProjectSchema,
  updateProjectSchema,
  projectListResponseSchema,
  projectResponseSchema,
  projectStatsDetailSchema,
  projectTreeResponseSchema,
  activityListResponseSchema,
} from '@localeflow/shared';
import { ProjectService } from '../services/project.service.js';
import { ActivityService } from '../services/activity.service.js';
import {
  toProjectDto,
  toProjectWithStatsDtoList,
  toProjectTreeDto,
} from '../dto/index.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const projectService = new ProjectService(fastify.prisma);
  const activityService = new ActivityService(fastify.prisma);

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
      const projects = await projectService.findByUserIdWithStats(request.user.userId);
      return { projects: toProjectWithStatsDtoList(projects) };
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

      const project = await projectService.create({
        name,
        slug,
        description,
        languageCodes,
        defaultLanguage,
        userId: request.user.userId,
      });

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
      const { id } = request.params;

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(id);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check membership and get role
      const role = await projectService.getMemberRole(
        project.id,
        request.user.userId
      );
      if (!role) {
        throw new ForbiddenError('Not a member of this project');
      }

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
      const { id } = request.params;
      const input = request.body;

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(id);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check membership and role
      const role = await projectService.getMemberRole(project.id, request.user.userId);
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      // Track which fields are being changed
      const changedFields: string[] = [];
      if (input.name !== undefined && input.name !== project.name) changedFields.push('name');
      if (input.description !== undefined && input.description !== project.description) changedFields.push('description');
      if (input.languageCodes !== undefined) changedFields.push('languageCodes');
      if (input.defaultLanguage !== undefined && input.defaultLanguage !== project.defaultLanguage) changedFields.push('defaultLanguage');

      const updated = await projectService.update(project.id, input);

      // Log activity (async, non-blocking)
      if (changedFields.length > 0) {
        activityService.log({
          type: 'project_settings',
          projectId: project.id,
          userId: request.user.userId,
          metadata: {
            changedFields,
          },
          changes: changedFields.map((field) => ({
            entityType: 'project',
            entityId: project.id,
            keyName: field,
            oldValue: String((project as unknown as Record<string, unknown>)[field] ?? ''),
            newValue: String((input as unknown as Record<string, unknown>)[field] ?? ''),
          })),
        });
      }

      return toProjectDto(updated, role);
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
      const { id } = request.params;

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(id);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check ownership
      const role = await projectService.getMemberRole(project.id, request.user.userId);
      if (role !== 'OWNER') {
        throw new ForbiddenError('Only project owner can delete');
      }

      await projectService.delete(project.id);
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
      const { id } = request.params;

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(id);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check membership
      const isMember = await projectService.checkMembership(
        project.id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const stats = await projectService.getStats(project.id);
      return stats;
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
      const { id } = request.params;

      // Look up project by ID or slug (flexible lookup)
      const projectRef = await projectService.findByIdOrSlug(id);
      if (!projectRef) {
        throw new NotFoundError('Project');
      }

      // Check membership
      const isMember = await projectService.checkMembership(
        projectRef.id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Fetch project with spaces and branches including key counts
      const project = await fastify.prisma.project.findUnique({
        where: { id: projectRef.id },
        select: {
          id: true,
          name: true,
          slug: true,
          spaces: {
            select: {
              id: true,
              name: true,
              slug: true,
              branches: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  isDefault: true,
                  _count: {
                    select: { keys: true },
                  },
                },
                orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!project) {
        throw new NotFoundError('Project');
      }

      return toProjectTreeDto(project);
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
      const { id } = request.params;
      const { limit, cursor } = request.query;

      // Look up project by ID or slug (flexible lookup)
      const project = await projectService.findByIdOrSlug(id);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check membership
      const isMember = await projectService.checkMembership(
        project.id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      return await activityService.getProjectActivities(project.id, {
        limit,
        cursor,
      });
    }
  );
};

export default projectRoutes;
