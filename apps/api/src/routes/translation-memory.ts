/**
 * Translation Memory Routes
 *
 * Provides endpoints for searching and managing translation memory.
 */
import {
  recordTMUsageSchema,
  tmReindexResponseSchema,
  tmSearchQuerySchema,
  tmSearchResponseSchema,
  tmStatsResponseSchema,
} from '@lingx/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  GetTMStatsQuery,
  RecordTMUsageCommand,
  ReindexTMCommand,
  SearchTMQuery,
} from '../modules/translation-memory/index.js';

const projectIdParam = z.object({ projectId: z.string() });

const translationMemoryRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/api/projects/:projectId/tm/search',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Search translation memory for similar translations',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        querystring: tmSearchQuerySchema,
        response: { 200: tmSearchResponseSchema },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { sourceText, sourceLanguage, targetLanguage, minSimilarity, limit } = request.query;

      return fastify.queryBus.execute(
        new SearchTMQuery(
          projectId,
          request.user.userId,
          sourceText,
          sourceLanguage,
          targetLanguage,
          minSimilarity,
          limit
        )
      );
    }
  );

  app.post(
    '/api/projects/:projectId/tm/record-usage',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Record when a TM suggestion is applied',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        body: recordTMUsageSchema,
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request) => {
      return fastify.commandBus.execute(
        new RecordTMUsageCommand(
          request.params.projectId,
          request.user.userId,
          request.body.entryId
        )
      );
    }
  );

  app.get(
    '/api/projects/:projectId/tm/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get translation memory statistics for a project',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        response: { 200: tmStatsResponseSchema },
      },
    },
    async (request) => {
      return fastify.queryBus.execute(
        new GetTMStatsQuery(request.params.projectId, request.user.userId)
      );
    }
  );

  app.post(
    '/api/projects/:projectId/tm/reindex',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Trigger a full reindex of translation memory (MANAGER/OWNER only)',
        tags: ['Translation Memory'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        response: { 200: tmReindexResponseSchema },
      },
    },
    async (request) => {
      return fastify.commandBus.execute(
        new ReindexTMCommand(request.params.projectId, request.user.userId)
      );
    }
  );
};

export default translationMemoryRoutes;
