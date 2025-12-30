/**
 * Branch Routes
 *
 * Handles branch CRUD operations and diff computation.
 * Per Design Doc: AC-WEB-012, AC-WEB-013, AC-WEB-014
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createBranchSchema,
  branchListResponseSchema,
  branchWithSpaceSchema,
  branchDiffResponseSchema,
  mergeRequestSchema,
  mergeResponseSchema,
} from '@localeflow/shared';
import { BranchService } from '../services/branch.service.js';
import { DiffService } from '../services/diff.service.js';
import { MergeService } from '../services/merge.service.js';
import { ProjectService } from '../services/project.service.js';
import { SpaceService } from '../services/space.service.js';
import { ActivityService } from '../services/activity.service.js';
import { toBranchDtoList, toBranchWithSpaceDto } from '../dto/index.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const branchRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const branchService = new BranchService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);
  const spaceService = new SpaceService(fastify.prisma);
  const activityService = new ActivityService(fastify.prisma);

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
    async (request, _reply) => {
      const { spaceId } = request.params;

      const projectId = await spaceService.getProjectIdBySpaceId(spaceId);
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

      const branches = await branchService.findBySpaceId(spaceId);
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
      const { spaceId } = request.params;
      const { name, fromBranchId } = request.body;

      const projectId = await spaceService.getProjectIdBySpaceId(spaceId);
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

      // Get source branch name for activity metadata
      const sourceBranch = await branchService.findById(fromBranchId);

      const branch = await branchService.create({
        name,
        spaceId,
        fromBranchId,
      });

      // Log activity (async, non-blocking)
      activityService.log({
        type: 'branch_create',
        projectId,
        branchId: branch.id,
        userId: request.user.userId,
        metadata: {
          branchName: name,
          branchId: branch.id,
          sourceBranchName: sourceBranch?.name,
          sourceBranchId: fromBranchId,
        },
        changes: [
          {
            entityType: 'branch',
            entityId: branch.id,
            newValue: name,
          },
        ],
      });

      // Fetch with space for response
      const branchWithSpace = await branchService.findById(branch.id);
      return reply.status(201).send(toBranchWithSpaceDto(branchWithSpace!));
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
    async (request, _reply) => {
      const { id } = request.params;

      const branch = await branchService.findById(id);
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      // Check membership via project
      const isMember = await projectService.checkMembership(
        branch.space.projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

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
      const { id } = request.params;

      // Get branch info before deletion for activity logging
      const branch = await branchService.findById(id);
      if (!branch) {
        throw new NotFoundError('Branch');
      }

      const projectId = await branchService.getProjectIdByBranchId(id);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      // Check membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      await branchService.delete(id);

      // Log activity (async, non-blocking)
      activityService.log({
        type: 'branch_delete',
        projectId,
        userId: request.user.userId,
        metadata: {
          branchName: branch.name,
          branchId: id,
        },
        changes: [
          {
            entityType: 'branch',
            entityId: id,
            oldValue: branch.name,
          },
        ],
      });

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
    async (request, _reply) => {
      const { id: sourceBranchId, targetId: targetBranchId } = request.params;

      const diffService = new DiffService(fastify.prisma);

      // Authorization: Check user has access to the branches' project
      const projectId = await branchService.getProjectIdByBranchId(sourceBranchId);

      if (!projectId) {
        throw new NotFoundError('Source branch');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );

      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const diff = await diffService.computeDiff(sourceBranchId, targetBranchId);
      return diff;
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
    async (request, _reply) => {
      const { id: sourceBranchId } = request.params;
      const { targetBranchId, resolutions } = request.body;

      const mergeService = new MergeService(fastify.prisma);

      // Authorization: Check user has access to the project
      const projectId = await branchService.getProjectIdByBranchId(sourceBranchId);

      if (!projectId) {
        throw new NotFoundError('Source branch');
      }

      // For merge operations, require project membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );

      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Get branch names for activity metadata
      const [sourceBranch, targetBranch] = await Promise.all([
        branchService.findById(sourceBranchId),
        branchService.findById(targetBranchId),
      ]);

      const result = await mergeService.merge(sourceBranchId, {
        targetBranchId,
        resolutions,
      });

      // Log activity only if merge was successful (no conflicts returned)
      if (result.success) {
        activityService.log({
          type: 'merge',
          projectId,
          branchId: targetBranchId,
          userId: request.user.userId,
          metadata: {
            sourceBranchName: sourceBranch?.name,
            sourceBranchId,
            targetBranchName: targetBranch?.name,
            targetBranchId,
            conflictsResolved: resolutions?.length || 0,
          },
          changes: [
            {
              entityType: 'merge',
              entityId: `${sourceBranchId}->${targetBranchId}`,
            },
          ],
        });
      }

      return result;
    }
  );
};

export default branchRoutes;
