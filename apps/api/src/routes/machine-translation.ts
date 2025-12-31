/**
 * Machine Translation Routes
 *
 * Provides endpoints for configuring and using machine translation providers.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  saveMTConfigSchema,
  mtConfigsListResponseSchema,
  translateRequestSchema,
  translateResponseSchema,
  multiTranslateRequestSchema,
  multiTranslateResponseSchema,
  batchTranslateRequestSchema,
  batchTranslateResponseSchema,
  preTranslateRequestSchema,
  preTranslateResponseSchema,
  mtUsageResponseSchema,
  testConnectionResponseSchema,
  mtProviderSchema,
} from '@localeflow/shared';
import { MTService } from '../services/mt.service.js';
import { ProjectService } from '../services/project.service.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';
import { mtBatchQueue } from '../lib/queues.js';
import type { MTJobData } from '../workers/mt-batch.worker.js';

const machineTranslationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const mtService = new MTService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

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

      const configs = await mtService.getConfigs(projectId);

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
    async (request, _reply) => {
      const { projectId } = request.params;
      const { provider, apiKey, isActive, priority } = request.body;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can configure machine translation'
        );
      }

      const config = await mtService.saveConfig(projectId, {
        provider,
        apiKey,
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
    async (request, _reply) => {
      const { projectId, provider } = request.params;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can configure machine translation'
        );
      }

      await mtService.deleteConfig(projectId, provider);

      return { success: true };
    }
  );

  /**
   * POST /api/projects/:projectId/mt/test - Test MT connection
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
    async (request, _reply) => {
      const { projectId, provider } = request.params;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can test machine translation'
        );
      }

      return await mtService.testConnection(projectId, provider);
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
    async (request, _reply) => {
      const { projectId } = request.params;
      const { text, sourceLanguage, targetLanguage, provider } = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      return await mtService.translate(
        projectId,
        text,
        sourceLanguage,
        targetLanguage,
        provider
      );
    }
  );

  /**
   * POST /api/projects/:projectId/mt/translate/multi - Translate to multiple languages
   *
   * Translates a single text to multiple target languages in one request.
   * More efficient than making separate requests for each language.
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
    async (request, _reply) => {
      const { projectId } = request.params;
      const { text, sourceLanguage, targetLanguages, provider } = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Translate to each target language
      const translations: Record<string, {
        translatedText: string;
        provider: 'DEEPL' | 'GOOGLE_TRANSLATE';
        cached: boolean;
        characterCount: number;
      }> = {};
      let totalCharacters = 0;

      // Process sequentially to avoid rate limits on external APIs
      for (const targetLang of targetLanguages) {
        try {
          const result = await mtService.translate(
            projectId,
            text,
            sourceLanguage,
            targetLang,
            provider
          );
          translations[targetLang] = result;
          totalCharacters += result.characterCount;
        } catch (error) {
          // Log error but continue with other languages
          console.error(`[MT] Failed to translate to ${targetLang}:`, error);
        }
      }

      return { translations, totalCharacters };
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
    async (request, _reply) => {
      const { projectId } = request.params;
      const { keyIds, targetLanguage, provider, overwriteExisting } = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Get project default language for source
      const project = await fastify.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Estimate character count
      const keys = await fastify.prisma.translationKey.findMany({
        where: { id: { in: keyIds } },
        include: {
          translations: {
            where: { language: project.defaultLanguage },
          },
        },
      });

      const estimatedCharacters = keys.reduce((sum, key) => {
        const sourceTranslation = key.translations[0];
        return sum + (sourceTranslation?.value?.length || 0);
      }, 0);

      // Queue the job
      const job = await mtBatchQueue.add('translate-batch', {
        type: 'translate-batch',
        projectId,
        keyIds,
        targetLanguage,
        provider,
        overwriteExisting,
        userId: request.user.userId,
      } as MTJobData);

      return {
        message: 'Batch translation queued',
        jobId: job.id,
        totalKeys: keyIds.length,
        estimatedCharacters,
      };
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
    async (request, _reply) => {
      const { projectId } = request.params;
      const { branchId, targetLanguages, provider } = request.body;

      // Verify MANAGER/OWNER access
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role || !['MANAGER', 'OWNER'].includes(role)) {
        throw new ForbiddenError(
          'Only managers and owners can pre-translate'
        );
      }

      // Get project default language for source
      const project = await fastify.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Count keys and estimate characters
      const keys = await fastify.prisma.translationKey.findMany({
        where: { branchId },
        include: {
          translations: {
            where: { language: project.defaultLanguage },
          },
        },
      });

      const estimatedCharacters = keys.reduce((sum, key) => {
        const sourceTranslation = key.translations[0];
        return sum + (sourceTranslation?.value?.length || 0) * targetLanguages.length;
      }, 0);

      // Queue the job
      const job = await mtBatchQueue.add('pre-translate', {
        type: 'pre-translate',
        projectId,
        branchId,
        targetLanguages,
        provider,
        userId: request.user.userId,
      } as MTJobData);

      return {
        message: 'Pre-translation queued',
        jobId: job.id!,
        totalKeys: keys.length,
        targetLanguages,
        estimatedCharacters,
      };
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

      const providers = await mtService.getUsage(projectId);

      return { providers };
    }
  );
};

export default machineTranslationRoutes;
