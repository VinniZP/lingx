/**
 * Machine Translation Routes
 *
 * Provides endpoints for configuring and using machine translation providers.
 */
import {
  batchTranslateRequestSchema,
  batchTranslateResponseSchema,
  mtConfigsListResponseSchema,
  mtProviderSchema,
  mtUsageResponseSchema,
  multiTranslateRequestSchema,
  multiTranslateResponseSchema,
  preTranslateRequestSchema,
  preTranslateResponseSchema,
  saveMTConfigSchema,
  testConnectionResponseSchema,
  translateRequestSchema,
  translateResponseSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  DeleteConfigCommand,
  GetConfigsQuery,
  GetUsageQuery,
  QueueBatchTranslateCommand,
  QueuePreTranslateCommand,
  SaveConfigCommand,
  TestConnectionCommand,
  TranslateMultiQuery,
  TranslateTextQuery,
  TranslateWithContextQuery,
} from '../modules/machine-translation/index.js';

const machineTranslationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // CONFIGURATION ENDPOINTS
  // ============================================

  /**
   * GET /api/projects/:projectId/mt/config - Get MT configurations
   */
  app.get(
    '/api/projects/:projectId/mt/config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get machine translation configurations for a project',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: mtConfigsListResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      const result = await fastify.queryBus.execute(
        new GetConfigsQuery(projectId, request.user.userId)
      );

      return {
        configs: result.configs.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
      };
    }
  );

  /**
   * POST /api/projects/:projectId/mt/config - Save MT configuration
   */
  app.post(
    '/api/projects/:projectId/mt/config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Save machine translation provider configuration',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: saveMTConfigSchema,
        response: {
          200: z.object({
            id: z.string(),
            provider: mtProviderSchema,
            keyPrefix: z.string(),
            isActive: z.boolean(),
            priority: z.number(),
            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { provider, apiKey, isActive, priority } = request.body;

      const config = await fastify.commandBus.execute(
        new SaveConfigCommand(projectId, request.user.userId, {
          provider,
          apiKey,
          isActive,
          priority,
        })
      );

      return {
        ...config,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      };
    }
  );

  /**
   * DELETE /api/projects/:projectId/mt/config/:provider - Delete MT configuration
   */
  app.delete(
    '/api/projects/:projectId/mt/config/:provider',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete machine translation provider configuration',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
          provider: mtProviderSchema,
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request) => {
      const { projectId, provider } = request.params;

      return await fastify.commandBus.execute(
        new DeleteConfigCommand(projectId, request.user.userId, provider)
      );
    }
  );

  /**
   * POST /api/projects/:projectId/mt/test/:provider - Test MT connection
   */
  app.post(
    '/api/projects/:projectId/mt/test/:provider',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Test machine translation provider connection',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
          provider: mtProviderSchema,
        }),
        response: {
          200: testConnectionResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId, provider } = request.params;

      return await fastify.commandBus.execute(
        new TestConnectionCommand(projectId, request.user.userId, provider)
      );
    }
  );

  // ============================================
  // TRANSLATION ENDPOINTS
  // ============================================

  /**
   * POST /api/projects/:projectId/mt/translate - Translate single text
   */
  app.post(
    '/api/projects/:projectId/mt/translate',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Translate a single text using machine translation',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: translateRequestSchema,
        response: {
          200: translateResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { text, sourceLanguage, targetLanguage, provider } = request.body;

      return await fastify.queryBus.execute(
        new TranslateTextQuery(projectId, request.user.userId, {
          text,
          sourceLanguage,
          targetLanguage,
          provider,
        })
      );
    }
  );

  /**
   * POST /api/projects/:projectId/mt/translate/context - Translate with AI context
   */
  app.post(
    '/api/projects/:projectId/mt/translate/context',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Translate with AI context from related translations and glossary',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: z.object({
          branchId: z.string().describe('Branch ID for context lookup'),
          keyId: z.string().describe('Translation key ID for context lookup'),
          text: z.string().min(1).describe('Text to translate'),
          sourceLanguage: z.string().describe('Source language code'),
          targetLanguage: z.string().describe('Target language code'),
          provider: mtProviderSchema.optional().describe('Specific provider to use'),
        }),
        response: {
          200: z.object({
            translatedText: z.string(),
            provider: mtProviderSchema,
            cached: z.boolean(),
            characterCount: z.number(),
            context: z
              .object({
                relatedTranslations: z.number(),
                glossaryTerms: z.number(),
              })
              .optional(),
          }),
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { branchId, keyId, text, sourceLanguage, targetLanguage, provider } = request.body;

      return await fastify.queryBus.execute(
        new TranslateWithContextQuery(projectId, request.user.userId, {
          branchId,
          keyId,
          text,
          sourceLanguage,
          targetLanguage,
          provider,
        })
      );
    }
  );

  /**
   * POST /api/projects/:projectId/mt/translate/multi - Translate to multiple languages
   */
  app.post(
    '/api/projects/:projectId/mt/translate/multi',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Translate a single text to multiple target languages',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: multiTranslateRequestSchema,
        response: {
          200: multiTranslateResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { text, sourceLanguage, targetLanguages, provider } = request.body;

      return await fastify.queryBus.execute(
        new TranslateMultiQuery(projectId, request.user.userId, {
          text,
          sourceLanguage,
          targetLanguages,
          provider,
        })
      );
    }
  );

  /**
   * POST /api/projects/:projectId/mt/translate/batch - Batch translate keys
   */
  app.post(
    '/api/projects/:projectId/mt/translate/batch',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Queue batch translation for multiple keys',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: batchTranslateRequestSchema,
        response: {
          200: batchTranslateResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { keyIds, targetLanguage, provider, overwriteExisting } = request.body;

      return await fastify.commandBus.execute(
        new QueueBatchTranslateCommand(projectId, request.user.userId, {
          keyIds,
          targetLanguage,
          provider,
          overwriteExisting,
        })
      );
    }
  );

  /**
   * POST /api/projects/:projectId/mt/pre-translate - Pre-translate missing translations
   */
  app.post(
    '/api/projects/:projectId/mt/pre-translate',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Pre-translate all missing translations for a branch',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: preTranslateRequestSchema,
        response: {
          200: preTranslateResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { branchId, targetLanguages, provider } = request.body;

      return await fastify.commandBus.execute(
        new QueuePreTranslateCommand(projectId, request.user.userId, {
          branchId,
          targetLanguages,
          provider,
        })
      );
    }
  );

  // ============================================
  // USAGE ENDPOINTS
  // ============================================

  /**
   * GET /api/projects/:projectId/mt/usage - Get usage statistics
   */
  app.get(
    '/api/projects/:projectId/mt/usage',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get machine translation usage statistics',
        tags: ['Machine Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: mtUsageResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return await fastify.queryBus.execute(new GetUsageQuery(projectId, request.user.userId));
    }
  );
};

export default machineTranslationRoutes;
