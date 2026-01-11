/**
 * Key Context Routes
 *
 * Provides endpoints for near-key context detection and management.
 */
import {
  aiContextQuerySchema,
  aiContextResponseSchema,
  analyzeRelationshipsResponseSchema,
  analyzeRelationshipsSchema,
  bulkContextUpdateResponseSchema,
  bulkKeyContextSchema,
  relatedKeysQuerySchema,
  relatedKeysResponseSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AnalyzeRelationshipsCommand,
  BulkUpdateKeyContextCommand,
  GetAIContextQuery,
  GetContextStatsQuery,
  GetRelatedKeysQuery,
} from '../modules/key-context/index.js';

const keyContextRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * PUT /api/branches/:branchId/keys/context - Bulk update key context
   */
  app.put(
    '/api/branches/:branchId/keys/context',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Bulk update key source context metadata from CLI extraction',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: bulkKeyContextSchema,
        response: {
          200: bulkContextUpdateResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { keys } = request.body;

      // Map keys to ensure namespace is null instead of undefined
      const mappedKeys = keys.map((k) => ({
        ...k,
        namespace: k.namespace ?? null,
      }));

      const result = await fastify.commandBus.execute(
        new BulkUpdateKeyContextCommand(branchId, mappedKeys, request.user.userId)
      );

      return result;
    }
  );

  /**
   * GET /api/branches/:branchId/keys/:keyId/related - Get related keys
   */
  app.get(
    '/api/branches/:branchId/keys/:keyId/related',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get related translation keys for context',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
          keyId: z.string(),
        }),
        querystring: relatedKeysQuerySchema,
        response: {
          200: relatedKeysResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId, keyId } = request.params;
      const { types, limit, includeTranslations } = request.query;

      // Parse types from comma-separated string
      const typeList = types
        ? (types.split(',') as Array<'SAME_FILE' | 'SAME_COMPONENT' | 'SEMANTIC'>)
        : undefined;

      const result = await fastify.queryBus.execute(
        new GetRelatedKeysQuery(
          branchId,
          keyId,
          typeList,
          limit,
          includeTranslations,
          request.user.userId
        )
      );

      return result;
    }
  );

  /**
   * GET /api/branches/:branchId/keys/:keyId/ai-context - Get AI context
   */
  app.get(
    '/api/branches/:branchId/keys/:keyId/ai-context',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get AI context for translation assistance',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
          keyId: z.string(),
        }),
        querystring: aiContextQuerySchema,
        response: {
          200: aiContextResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId, keyId } = request.params;
      const { targetLanguage } = request.query;

      const result = await fastify.queryBus.execute(
        new GetAIContextQuery(branchId, keyId, targetLanguage, request.user.userId)
      );

      return result;
    }
  );

  /**
   * POST /api/branches/:branchId/keys/analyze-relationships - Trigger analysis
   */
  app.post(
    '/api/branches/:branchId/keys/analyze-relationships',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Trigger relationship analysis (background job)',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: analyzeRelationshipsSchema,
        response: {
          202: analyzeRelationshipsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { branchId } = request.params;
      const { types, minSimilarity } = request.body;

      const result = await fastify.commandBus.execute(
        new AnalyzeRelationshipsCommand(
          branchId,
          types ?? ['SEMANTIC'],
          minSimilarity ?? 0.7,
          request.user.userId
        )
      );

      return reply.status(202).send(result);
    }
  );

  /**
   * GET /api/branches/:branchId/keys/context/stats - Get context stats
   */
  app.get(
    '/api/branches/:branchId/keys/context/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get key context and relationship statistics',
        tags: ['Key Context'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        response: {
          200: z.object({
            sameFile: z.number(),
            sameComponent: z.number(),
            semantic: z.number(),
            nearby: z.number(),
            keyPattern: z.number(),
            keysWithSource: z.number(),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;

      const result = await fastify.queryBus.execute(
        new GetContextStatsQuery(branchId, request.user.userId)
      );

      return result;
    }
  );
};

export default keyContextRoutes;
