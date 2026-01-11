/**
 * AI Translation Routes
 *
 * Provides endpoints for configuring and using AI-powered translation.
 */
import {
  aiConfigResponseSchema,
  aiConfigsListResponseSchema,
  aiContextConfigSchema,
  aiProviderSchema,
  aiSupportedModelsResponseSchema,
  aiTestConnectionResponseSchema,
  aiTranslateRequestSchema,
  aiTranslateResponseSchema,
  aiUsageResponseSchema,
  saveAIConfigSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  DeleteConfigCommand,
  GetConfigsQuery,
  GetContextConfigQuery,
  GetSupportedModelsQuery,
  GetUsageQuery,
  SaveConfigCommand,
  TestConnectionCommand,
  TranslateQuery,
  UpdateContextConfigCommand,
  type AIProviderType,
} from '../modules/ai-translation/index.js';

const aiTranslationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // CONFIGURATION ENDPOINTS
  // ============================================

  /**
   * GET /api/projects/:projectId/ai/config - Get AI configurations
   */
  app.get(
    '/api/projects/:projectId/ai/config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get AI translation configurations for a project',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: aiConfigsListResponseSchema,
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
   * POST /api/projects/:projectId/ai/config - Save AI configuration
   */
  app.post(
    '/api/projects/:projectId/ai/config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Save AI translation provider configuration',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: saveAIConfigSchema,
        response: {
          200: aiConfigResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { provider, apiKey, model, isActive, priority } = request.body;

      const config = await fastify.commandBus.execute(
        new SaveConfigCommand(projectId, request.user.userId, {
          provider: provider as AIProviderType,
          apiKey,
          model,
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
   * DELETE /api/projects/:projectId/ai/config/:provider - Delete AI configuration
   */
  app.delete(
    '/api/projects/:projectId/ai/config/:provider',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete AI translation provider configuration',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
          provider: aiProviderSchema,
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request) => {
      const { projectId, provider } = request.params;

      return await fastify.commandBus.execute(
        new DeleteConfigCommand(projectId, request.user.userId, provider as AIProviderType)
      );
    }
  );

  /**
   * GET /api/projects/:projectId/ai/context-config - Get context configuration
   */
  app.get(
    '/api/projects/:projectId/ai/context-config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get AI context configuration for a project',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: aiContextConfigSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return await fastify.queryBus.execute(
        new GetContextConfigQuery(projectId, request.user.userId)
      );
    }
  );

  /**
   * PUT /api/projects/:projectId/ai/context-config - Update context configuration
   */
  app.put(
    '/api/projects/:projectId/ai/context-config',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update AI context configuration for a project',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: aiContextConfigSchema.partial(),
        response: {
          200: aiContextConfigSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return await fastify.commandBus.execute(
        new UpdateContextConfigCommand(projectId, request.user.userId, request.body)
      );
    }
  );

  /**
   * POST /api/projects/:projectId/ai/test/:provider - Test AI connection
   */
  app.post(
    '/api/projects/:projectId/ai/test/:provider',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Test AI provider connection',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string(),
          provider: aiProviderSchema,
        }),
        response: {
          200: aiTestConnectionResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId, provider } = request.params;

      return await fastify.commandBus.execute(
        new TestConnectionCommand(projectId, request.user.userId, provider as AIProviderType)
      );
    }
  );

  /**
   * GET /api/ai/models/:provider - Get supported models for provider
   */
  app.get(
    '/api/ai/models/:provider',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get supported models for an AI provider',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          provider: aiProviderSchema,
        }),
        response: {
          200: aiSupportedModelsResponseSchema,
        },
      },
    },
    async (request) => {
      const { provider } = request.params;

      return await fastify.queryBus.execute(
        new GetSupportedModelsQuery(provider as AIProviderType)
      );
    }
  );

  // ============================================
  // TRANSLATION ENDPOINT
  // ============================================

  /**
   * POST /api/projects/:projectId/ai/translate - Translate with AI
   */
  app.post(
    '/api/projects/:projectId/ai/translate',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Translate text using AI with context',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: aiTranslateRequestSchema,
        response: {
          200: aiTranslateResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { text, sourceLanguage, targetLanguage, keyId, branchId, provider } = request.body;

      return await fastify.queryBus.execute(
        new TranslateQuery(projectId, request.user.userId, {
          text,
          sourceLanguage,
          targetLanguage,
          keyId,
          branchId,
          provider: provider as AIProviderType | undefined,
        })
      );
    }
  );

  // ============================================
  // USAGE ENDPOINT
  // ============================================

  /**
   * GET /api/projects/:projectId/ai/usage - Get AI usage stats
   */
  app.get(
    '/api/projects/:projectId/ai/usage',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get AI translation usage statistics',
        tags: ['AI Translation'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: aiUsageResponseSchema,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return await fastify.queryBus.execute(new GetUsageQuery(projectId, request.user.userId));
    }
  );
};

export default aiTranslationRoutes;
