/**
 * Environment Routes
 *
 * Handles environment CRUD operations with branch pointer management.
 * Per Design Doc: AC-WEB-017, AC-WEB-018, AC-WEB-019
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createEnvironmentSchema,
  updateEnvironmentSchema,
  switchBranchSchema,
  environmentListResponseSchema,
  environmentResponseSchema,
} from '@localeflow/shared';
import { EnvironmentService } from '../services/environment.service.js';
import { ProjectService } from '../services/project.service.js';
import { ActivityService } from '../services/activity.service.js';
import { BranchService } from '../services/branch.service.js';
import { toEnvironmentDto, toEnvironmentDtoList } from '../dto/index.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const environmentRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const environmentService = new EnvironmentService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);
  const activityService = new ActivityService(fastify.prisma);
  const branchService = new BranchService(fastify.prisma);

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

      const isMember = await projectService.checkMembership(
        project.id,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const environments = await environmentService.findByProjectId(project.id);
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
      const role = await projectService.getMemberRole(
        project.id,
        request.user.userId
      );
      if (!role || role === 'DEVELOPER') {
        throw new ForbiddenError('Requires manager or owner role');
      }

      const environment = await environmentService.create({
        name,
        slug,
        projectId: project.id,
        branchId,
      });

      // Log activity (async, non-blocking)
      activityService.log({
        type: 'environment_create',
        projectId: project.id,
        branchId,
        userId: request.user.userId,
        metadata: {
          environmentName: name,
          environmentId: environment.id,
        },
        changes: [
          {
            entityType: 'environment',
            entityId: environment.id,
            newValue: name,
          },
        ],
      });

      // Fetch with branch for response
      const envWithBranch = await environmentService.findById(environment.id);
      return reply.status(201).send(toEnvironmentDto(envWithBranch!));
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

      const updated = await environmentService.update(id, input);
      const updatedWithBranch = await environmentService.findById(updated.id);
      return toEnvironmentDto(updatedWithBranch!);
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

      // Get old and new branch names for activity logging
      const oldBranchId = environment.branchId;
      const [oldBranch, newBranch] = await Promise.all([
        oldBranchId ? branchService.findById(oldBranchId) : null,
        branchService.findById(branchId),
      ]);

      const result = await environmentService.switchBranch(id, branchId);

      // Log activity (async, non-blocking)
      activityService.log({
        type: 'environment_switch_branch',
        projectId: environment.projectId,
        branchId,
        userId: request.user.userId,
        metadata: {
          environmentName: environment.name,
          environmentId: id,
          oldBranchName: oldBranch?.name,
          newBranchName: newBranch?.name,
        },
        changes: [
          {
            entityType: 'environment',
            entityId: id,
            oldValue: oldBranch?.name,
            newValue: newBranch?.name,
          },
        ],
      });

      const resultWithBranch = await environmentService.findById(result.id);
      return toEnvironmentDto(resultWithBranch!);
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

      // Log activity (async, non-blocking)
      activityService.log({
        type: 'environment_delete',
        projectId: environment.projectId,
        userId: request.user.userId,
        metadata: {
          environmentName: environment.name,
          environmentId: id,
        },
        changes: [
          {
            entityType: 'environment',
            entityId: id,
            oldValue: environment.name,
          },
        ],
      });

      return reply.status(204).send();
    }
  );
};

export default environmentRoutes;
