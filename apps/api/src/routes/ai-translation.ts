/**
 * AI Translation Routes
 *
 * Provides endpoints for configuring and using AI-powered translation.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  saveAIConfigSchema,
  aiConfigsListResponseSchema,
  aiContextConfigSchema,
  aiTranslateRequestSchema,
  aiTranslateResponseSchema,
  aiUsageResponseSchema,
  aiTestConnectionResponseSchema,
  aiSupportedModelsResponseSchema,
  aiProviderSchema,
  aiConfigResponseSchema,
} from '@lingx/shared';
import { AITranslationService, type AIProviderType } from '../services/ai-translation.service.js';
import { ProjectService } from '../services/project.service.js';
import { ForbiddenError } from '../plugins/error-handler.js';

const aiTranslationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const aiService = new AITranslationService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

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

      const configs = await aiService.getConfigs(projectId);

      return {
        configs: configs.map((c) => ({
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
    async (request, _reply) => {
      const { projectId } = request.params;
      const { provider, apiKey, model, isActive, priority } = request.body;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can configure AI translation'
        );
      }

      const config = await aiService.saveConfig(projectId, {
        provider,
        apiKey,
        model,
        isActive,
        priority,
      });

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
    async (request, _reply) => {
      const { projectId, provider } = request.params;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can configure AI translation'
        );
      }

      await aiService.deleteConfig(projectId, provider as AIProviderType);

      return { success: true };
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

      return aiService.getContextConfig(projectId);
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
    async (request, _reply) => {
      const { projectId } = request.params;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can configure AI translation'
        );
      }

      return aiService.updateContextConfig(projectId, request.body);
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
    async (request, _reply) => {
      const { projectId, provider } = request.params;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can test AI connections'
        );
      }

      return aiService.testConnection(projectId, provider as AIProviderType);
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
    async (request, _reply) => {
      const { provider } = request.params;

      const models = aiService.getSupportedModels(provider as AIProviderType);

      return { models };
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
    async (request, _reply) => {
      const { projectId } = request.params;
      const { text, sourceLanguage, targetLanguage, keyId, branchId, provider } = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      const result = await aiService.translate(projectId, {
        text,
        sourceLanguage,
        targetLanguage,
        keyId,
        branchId,
        provider: provider as AIProviderType | undefined,
      });

      return result;
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

      const stats = await aiService.getUsage(projectId);

      return { providers: stats };
    }
  );
};

export default aiTranslationRoutes;
