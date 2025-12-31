/**
 * Translation Memory Routes
 *
 * Provides endpoints for searching and managing translation memory.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  tmSearchQuerySchema,
  tmSearchResponseSchema,
  recordTMUsageSchema,
  tmStatsResponseSchema,
  tmReindexResponseSchema,
} from '@localeflow/shared';
import { TranslationMemoryService } from '../services/translation-memory.service.js';
import { ProjectService } from '../services/project.service.js';
import { translationMemoryQueue } from '../lib/queues.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';
import type { TMJobData } from '../workers/translation-memory.worker.js';

const translationMemoryRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const tmService = new TranslationMemoryService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

  /**
   * GET /api/projects/:projectId/tm/search - Search translation memory
   */
  app.get(
    '/api/projects/:projectId/tm/search',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Search translation memory for similar translations',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        querystring: tmSearchQuerySchema,
        response: {
          200: tmSearchResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const { sourceText, sourceLanguage, targetLanguage, minSimilarity, limit } =
        request.query;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      const matches = await tmService.searchSimilar({
        projectId,
        sourceText,
        sourceLanguage,
        targetLanguage,
        minSimilarity,
        limit,
      });

      return { matches };
    }
  );

  /**
   * POST /api/projects/:projectId/tm/record-usage - Record TM usage
   */
  app.post(
    '/api/projects/:projectId/tm/record-usage',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Record when a TM suggestion is applied',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: recordTMUsageSchema,
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const { entryId } = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Queue usage recording (non-blocking)
      const tmJob: TMJobData = {
        type: 'update-usage',
        projectId,
        entryId,
      };
      await translationMemoryQueue.add('update-usage', tmJob);

      return { success: true };
    }
  );

  /**
   * GET /api/projects/:projectId/tm/stats - Get TM statistics
   */
  app.get(
    '/api/projects/:projectId/tm/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get translation memory statistics for a project',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: tmStatsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      return tmService.getStats(projectId);
    }
  );

  /**
   * POST /api/projects/:projectId/tm/reindex - Trigger TM reindex (MANAGER/OWNER only)
   */
  app.post(
    '/api/projects/:projectId/tm/reindex',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          'Trigger a full reindex of translation memory from approved translations (MANAGER/OWNER only)',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: tmReindexResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;

      // Verify project access with MANAGER or OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError(
          'Only MANAGER or OWNER can trigger TM reindex'
        );
      }

      // Queue bulk index job
      const tmJob: TMJobData = {
        type: 'bulk-index',
        projectId,
      };
      const job = await translationMemoryQueue.add('bulk-index', tmJob);

      return {
        message: 'Reindex job queued',
        jobId: job.id,
      };
    }
  );
};

export default translationMemoryRoutes;
