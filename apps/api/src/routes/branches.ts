/**
 * Branch Routes
 *
 * Handles branch CRUD operations and diff computation.
 * Per Design Doc: AC-WEB-012, AC-WEB-013, AC-WEB-014
 */
import { FastifyPluginAsync } from 'fastify';
import { BranchService } from '../services/branch.service.js';
import { DiffService } from '../services/diff.service.js';
import { ProjectService } from '../services/project.service.js';
import { SpaceService } from '../services/space.service.js';
import {
  createBranchSchema,
  branchListSchema,
  branchDetailSchema,
} from '../schemas/branch.schema.js';
import { branchDiffSchema } from '../schemas/diff.schema.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const branchRoutes: FastifyPluginAsync = async (fastify) => {
  const branchService = new BranchService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);
  const spaceService = new SpaceService(fastify.prisma);

  /**
   * GET /api/spaces/:spaceId/branches - List branches for a space
   */
  fastify.get(
    '/api/spaces/:spaceId/branches',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all branches for a space',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            spaceId: { type: 'string' },
          },
        },
        ...branchListSchema,
      },
    },
    async (request, _reply) => {
      const { spaceId } = request.params as { spaceId: string };

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
      return { branches };
    }
  );

  /**
   * POST /api/spaces/:spaceId/branches - Create new branch (copy-on-write)
   */
  fastify.post(
    '/api/spaces/:spaceId/branches',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new branch with copy-on-write from source branch',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            spaceId: { type: 'string' },
          },
        },
        ...createBranchSchema,
      },
    },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const { name, fromBranchId } = request.body as {
        name: string;
        fromBranchId: string;
      };

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

      const branch = await branchService.create({
        name,
        spaceId,
        fromBranchId,
      });

      return reply.status(201).send(branch);
    }
  );

  /**
   * GET /api/branches/:id - Get branch details
   */
  fastify.get(
    '/api/branches/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get branch by ID with details',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: branchDetailSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };

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

      return branch;
    }
  );

  /**
   * DELETE /api/branches/:id - Delete branch
   */
  fastify.delete(
    '/api/branches/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete branch (cannot delete default branch)',
        tags: ['Branches'],
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
      return reply.status(204).send();
    }
  );

  /**
   * GET /api/branches/:id/diff/:targetId - Compare two branches
   *
   * Per Design Doc: AC-WEB-014 - Diff shows added, modified, deleted keys
   * Returns categorized changes between source and target branches.
   */
  fastify.get(
    '/api/branches/:id/diff/:targetId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Compare two branches and show differences',
        tags: ['Branches'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        ...branchDiffSchema,
      },
    },
    async (request, _reply) => {
      const { id: sourceBranchId, targetId: targetBranchId } = request.params as {
        id: string;
        targetId: string;
      };

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
};

export default branchRoutes;
