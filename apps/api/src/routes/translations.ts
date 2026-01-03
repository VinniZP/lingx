/**
 * Translation Routes
 *
 * Handles translation key and value CRUD operations.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createKeySchema,
  updateKeySchema,
  updateTranslationsSchema,
  setTranslationSchema,
  bulkDeleteKeysSchema,
  bulkUpdateTranslationsSchema,
  keyListResponseSchema,
  keyListQuerySchema,
  translationKeyResponseSchema,
  translationValueSchema,
  bulkDeleteResponseSchema,
  setApprovalStatusSchema,
  batchApprovalSchema,
  batchQualityCheckResponseSchema,
  qualityIssueSchema,
  namespaceListResponseSchema,
} from '@lingx/shared';
import { TranslationService } from '../services/translation.service.js';
import { ProjectService } from '../services/project.service.js';
import { BranchService } from '../services/branch.service.js';
import { ActivityService } from '../services/activity.service.js';
import { MTService } from '../services/mt.service.js';
import { AITranslationService } from '../services/ai-translation.service.js';
import { translationMemoryQueue, mtBatchQueue } from '../lib/queues.js';
import type { TMJobData } from '../workers/translation-memory.worker.js';
import {
  toTranslationKeyDto,
  toKeyListResultDto,
  toTranslationValueDto,
} from '../dto/index.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const translationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const translationService = new TranslationService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);
  const branchService = new BranchService(fastify.prisma);
  const activityService = new ActivityService(fastify.prisma);
  const mtService = new MTService(fastify.prisma);
  const aiService = new AITranslationService(fastify.prisma);

  /**
   * GET /api/branches/:branchId/keys - List keys with pagination, search, and filter
   */
  app.get(
    '/api/branches/:branchId/keys',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List translation keys with pagination, search, and filter',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        querystring: keyListQuerySchema,
        response: {
          200: keyListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { search, page, limit, filter, qualityFilter, namespace } = request.query;

      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const result = await translationService.findKeysByBranchId(branchId, {
        search,
        page,
        limit,
        filter,
        qualityFilter,
        namespace,
      });
      return toKeyListResultDto(result);
    }
  );

  /**
   * GET /api/branches/:branchId/keys/namespaces - List unique namespaces with counts
   */
  app.get(
    '/api/branches/:branchId/keys/namespaces',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List unique namespaces with key counts',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        response: {
          200: namespaceListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;

      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const namespaces = await translationService.getNamespaces(branchId);
      return { namespaces };
    }
  );

  /**
   * POST /api/branches/:branchId/keys - Create new key
   */
  app.post(
    '/api/branches/:branchId/keys',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new translation key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: createKeySchema,
        response: {
          201: translationKeyResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { branchId } = request.params;
      const { name, namespace, description } = request.body;

      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const key = await translationService.createKey({
        name,
        namespace,
        description,
        branchId,
      });

      // Log activity (async, non-blocking)
      activityService.log({
        type: 'key_add',
        projectId,
        branchId,
        userId: request.user.userId,
        metadata: {},
        changes: [
          {
            entityType: 'key',
            entityId: key.id,
            keyName: name,
          },
        ],
      });

      return reply.status(201).send(toTranslationKeyDto(key));
    }
  );

  /**
   * GET /api/keys/:id - Get key with translations
   */
  app.get(
    '/api/keys/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get translation key with all translations',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: translationKeyResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params;

      const key = await translationService.findKeyById(id);
      if (!key) {
        throw new NotFoundError('Translation key');
      }

      const projectId = await translationService.getProjectIdByKeyId(id);
      if (projectId) {
        const isMember = await projectService.checkMembership(
          projectId,
          request.user.userId
        );
        if (!isMember) {
          throw new ForbiddenError('Not a member of this project');
        }
      }

      return toTranslationKeyDto(key);
    }
  );

  /**
   * PUT /api/keys/:id - Update key
   */
  app.put(
    '/api/keys/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update translation key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: updateKeySchema,
        response: {
          200: translationKeyResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { name, namespace, description } = request.body;

      const projectId = await translationService.getProjectIdByKeyId(id);
      if (!projectId) {
        throw new NotFoundError('Translation key');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const updated = await translationService.updateKey(id, { name, namespace, description });
      return toTranslationKeyDto(updated);
    }
  );

  /**
   * DELETE /api/keys/:id - Delete key
   */
  app.delete(
    '/api/keys/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete translation key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Get key info before deletion for activity logging
      const key = await translationService.findKeyById(id);
      if (!key) {
        throw new NotFoundError('Translation key');
      }

      const projectId = await translationService.getProjectIdByKeyId(id);
      if (!projectId) {
        throw new NotFoundError('Translation key');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      await translationService.deleteKey(id);

      // Log activity (async, non-blocking)
      activityService.log({
        type: 'key_delete',
        projectId,
        branchId: key.branchId,
        userId: request.user.userId,
        metadata: {},
        changes: [
          {
            entityType: 'key',
            entityId: id,
            keyName: key.name,
          },
        ],
      });

      return reply.status(204).send();
    }
  );

  /**
   * POST /api/branches/:branchId/keys/bulk-delete - Bulk delete keys
   */
  app.post(
    '/api/branches/:branchId/keys/bulk-delete',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Bulk delete translation keys',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: bulkDeleteKeysSchema,
        response: {
          200: bulkDeleteResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { keyIds } = request.body;

      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Get key names before deletion for activity logging
      const keysToDelete = await fastify.prisma.translationKey.findMany({
        where: { id: { in: keyIds }, branchId },
        select: { id: true, name: true },
      });

      const deleted = await translationService.bulkDeleteKeys(branchId, keyIds);

      // Log activity (async, non-blocking)
      if (keysToDelete.length > 0) {
        activityService.log({
          type: 'key_delete',
          projectId,
          branchId,
          userId: request.user.userId,
          metadata: {},
          changes: keysToDelete.map((key) => ({
            entityType: 'key',
            entityId: key.id,
            keyName: key.name,
          })),
        });
      }

      return { deleted };
    }
  );

  /**
   * PUT /api/keys/:id/translations - Update all translations for a key
   */
  app.put(
    '/api/keys/:id/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update translations for a key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: updateTranslationsSchema,
        response: {
          200: translationKeyResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { translations } = request.body;

      const projectId = await translationService.getProjectIdByKeyId(id);
      if (!projectId) {
        throw new NotFoundError('Translation key');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Get key info and old translations for activity logging
      const key = await translationService.findKeyById(id);
      const oldTranslations: Record<string, string | undefined> = {};
      if (key) {
        for (const t of key.translations) {
          oldTranslations[t.language] = t.value;
        }
      }

      const result = await translationService.updateKeyTranslations(id, translations);

      // Log activity (async, non-blocking)
      const changedLanguages = Object.keys(translations).filter(
        (lang) => translations[lang] !== oldTranslations[lang]
      );
      if (changedLanguages.length > 0 && key) {
        activityService.log({
          type: 'translation',
          projectId,
          branchId: key.branchId,
          userId: request.user.userId,
          metadata: {
            languages: changedLanguages,
          },
          changes: changedLanguages.map((lang) => ({
            entityType: 'translation',
            entityId: id,
            keyName: key.name,
            language: lang,
            oldValue: oldTranslations[lang],
            newValue: translations[lang],
          })),
        });
      }

      return toTranslationKeyDto(result);
    }
  );

  /**
   * PUT /api/keys/:keyId/translations/:lang - Set single translation
   */
  app.put(
    '/api/keys/:keyId/translations/:lang',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Set translation for a specific language',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          keyId: z.string(),
          lang: z.string(),
        }),
        body: setTranslationSchema,
        response: {
          200: translationValueSchema,
        },
      },
    },
    async (request, _reply) => {
      const { keyId, lang } = request.params;
      const { value } = request.body;

      const projectId = await translationService.getProjectIdByKeyId(keyId);
      if (!projectId) {
        throw new NotFoundError('Translation key');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Get key info and old value for activity logging
      const key = await translationService.findKeyById(keyId);
      const oldValue = key?.translations.find((t) => t.language === lang)?.value;

      const result = await translationService.setTranslation(keyId, lang, value);

      // Log activity (async, non-blocking)
      if (key && value !== oldValue) {
        activityService.log({
          type: 'translation',
          projectId,
          branchId: key.branchId,
          userId: request.user.userId,
          metadata: {
            languages: [lang],
          },
          changes: [
            {
              entityType: 'translation',
              entityId: keyId,
              keyName: key.name,
              language: lang,
              oldValue,
              newValue: value,
            },
          ],
        });
      }

      return toTranslationValueDto(result);
    }
  );

  // Response schema for branch translations (GET)
  const branchTranslationsResponseSchema = z.object({
    translations: z.record(z.string(), z.record(z.string(), z.string())),
    languages: z.array(z.string()),
  });

  // Response schema for bulk update result
  const bulkUpdateResultSchema = z.object({
    updated: z.number(),
    created: z.number(),
  });

  /**
   * GET /api/branches/:branchId/translations - Get all translations (for CLI)
   */
  app.get(
    '/api/branches/:branchId/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get all translations for a branch (CLI pull)',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        response: {
          200: branchTranslationsResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;

      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      return translationService.getBranchTranslations(branchId);
    }
  );

  /**
   * PUT /api/branches/:branchId/translations - Bulk update translations (CLI push)
   */
  app.put(
    '/api/branches/:branchId/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Bulk update translations for a branch (CLI push)',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: bulkUpdateTranslationsSchema,
        response: {
          200: bulkUpdateResultSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { translations } = request.body;

      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      const result = await translationService.bulkUpdateTranslations(branchId, translations);

      // Log activity for CLI push operation
      const keyCount = Object.keys(translations).length;
      const languages = new Set<string>();
      for (const keyTranslations of Object.values(translations)) {
        for (const lang of Object.keys(keyTranslations)) {
          languages.add(lang);
        }
      }

      if (keyCount > 0) {
        // Log as import activity (CLI push is conceptually an import)
        activityService.log({
          type: 'import',
          projectId,
          branchId,
          userId: request.user.userId,
          metadata: {
            keyCount,
            languages: Array.from(languages),
            format: 'cli_push',
          },
          changes: Object.entries(translations)
            .slice(0, 50) // Limit changes logged (full audit would be too large)
            .flatMap(([keyName, keyTranslations]) =>
              Object.entries(keyTranslations).map(([lang, value]) => ({
                entityType: 'translation',
                entityId: keyName,
                keyName,
                language: lang,
                newValue: value,
              }))
            ),
        });
      }

      return result;
    }
  );

  // ============================================
  // APPROVAL WORKFLOW ROUTES
  // ============================================

  /**
   * PUT /api/translations/:id/status - Set approval status for a single translation
   * Only MANAGER or OWNER role can approve/reject
   */
  app.put(
    '/api/translations/:id/status',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Set approval status for a translation (MANAGER/OWNER only)',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: setApprovalStatusSchema,
        response: {
          200: translationValueSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { status } = request.body;

      // Get project ID for authorization
      const projectId = await translationService.getProjectIdByTranslationId(id);
      if (!projectId) {
        throw new NotFoundError('Translation');
      }

      // Check membership and role
      const memberRole = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!memberRole) {
        throw new ForbiddenError('Not a member of this project');
      }
      if (memberRole === 'DEVELOPER') {
        throw new ForbiddenError('Only MANAGER or OWNER can approve/reject translations');
      }

      // Get translation info for activity logging
      const translation = await translationService.findTranslationById(id);
      const keyInfo = translation
        ? await translationService.findKeyById(translation.keyId)
        : null;

      const result = await translationService.setApprovalStatus(
        id,
        status,
        request.user.userId
      );

      // Log activity
      if (keyInfo) {
        activityService.log({
          type: status === 'APPROVED' ? 'translation_approve' : 'translation_reject',
          projectId,
          branchId: keyInfo.branchId,
          userId: request.user.userId,
          metadata: {
            languages: [result.language],
          },
          changes: [
            {
              entityType: 'translation',
              entityId: id,
              keyName: keyInfo.name,
              language: result.language,
            },
          ],
        });

        // Queue translation memory indexing for approved translations
        if (status === 'APPROVED') {
          const tmJob: TMJobData = {
            type: 'index-approved',
            projectId,
            translationId: id,
          };
          translationMemoryQueue.add('index-approved', tmJob).catch((err) => {
            console.error('[TM] Failed to queue indexing job:', err);
          });
        }
      }

      return toTranslationValueDto(result);
    }
  );

  /**
   * POST /api/branches/:branchId/translations/batch-approve - Batch approve/reject translations
   * Only MANAGER or OWNER role can approve/reject
   */
  app.post(
    '/api/branches/:branchId/translations/batch-approve',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Batch approve/reject multiple translations (MANAGER/OWNER only)',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: batchApprovalSchema,
        response: {
          200: z.object({
            updated: z.number(),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { translationIds, status } = request.body;

      // Get project ID from branch
      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      // Check membership and role
      const memberRole = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!memberRole) {
        throw new ForbiddenError('Not a member of this project');
      }
      if (memberRole === 'DEVELOPER') {
        throw new ForbiddenError('Only MANAGER or OWNER can approve/reject translations');
      }

      // Verify all translations belong to the same project
      const translationProjectId =
        await translationService.verifyTranslationsBelongToSameProject(translationIds);
      if (!translationProjectId || translationProjectId !== projectId) {
        throw new ForbiddenError('Some translations do not belong to this project');
      }

      const updated = await translationService.batchSetApprovalStatus(
        translationIds,
        status,
        request.user.userId
      );

      // Log activity
      activityService.log({
        type: status === 'APPROVED' ? 'translation_approve' : 'translation_reject',
        projectId,
        branchId,
        userId: request.user.userId,
        metadata: {
          keyCount: updated,
        },
        changes: [], // We could expand this to include all changed translations
      });

      // Queue translation memory indexing for batch approved translations
      if (status === 'APPROVED' && translationIds.length > 0) {
        const tmJobs = translationIds.map((translationId) => ({
          name: 'index-approved',
          data: {
            type: 'index-approved' as const,
            projectId,
            translationId,
          },
        }));
        translationMemoryQueue.addBulk(tmJobs).catch((err) => {
          console.error('[TM] Failed to queue batch indexing jobs:', err);
        });
      }

      return { updated };
    }
  );

  // ============================================
  // QUALITY CHECKS
  // ============================================

  /**
   * POST /api/branches/:branchId/quality-check - Run quality checks on translations
   */
  app.post(
    '/api/branches/:branchId/quality-check',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Run quality checks on branch translations',
        tags: ['Translations', 'Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        querystring: z.object({
          keyIds: z.string().optional().describe('Comma-separated key IDs to check'),
        }),
        response: {
          200: batchQualityCheckResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { keyIds: keyIdsStr } = request.query;

      // Verify branch exists and get project
      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      // Check project membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Get project's default language
      const project = await projectService.findById(projectId);
      const sourceLanguage = project?.defaultLanguage || 'en';

      // Parse key IDs if provided
      const keyIds = keyIdsStr ? keyIdsStr.split(',').filter(Boolean) : undefined;

      // Run quality checks
      const result = await translationService.checkBranchQuality(
        branchId,
        sourceLanguage,
        keyIds
      );

      return {
        totalKeys: result.totalKeys,
        keysWithIssues: result.keysWithIssues,
        results: result.results.map((r) => ({
          keyName: r.keyName,
          keyId: r.keyId,
          language: r.language,
          result: r.result,
        })),
      };
    }
  );

  /**
   * PUT /api/keys/:keyId/translations/:lang with quality check response
   * Modified to return quality issues in response
   */
  app.put(
    '/api/keys/:keyId/translations/:lang/check',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Set translation with quality check feedback',
        tags: ['Translations', 'Quality'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          keyId: z.string(),
          lang: z.string(),
        }),
        body: setTranslationSchema,
        response: {
          200: translationValueSchema.extend({
            qualityIssues: z.array(qualityIssueSchema).optional(),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { keyId, lang } = request.params;
      const { value } = request.body;

      // Verify key exists and get project
      const projectId = await translationService.getProjectIdByKeyId(keyId);
      if (!projectId) {
        throw new NotFoundError('Translation key');
      }

      // Check project membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Get project's default language
      const project = await projectService.findById(projectId);
      const sourceLanguage = project?.defaultLanguage || 'en';

      // Set translation with quality check
      const { translation, qualityIssues } = await translationService.setTranslationWithQuality(
        keyId,
        lang,
        value,
        sourceLanguage
      );

      return {
        ...toTranslationValueDto(translation),
        qualityIssues: qualityIssues.length > 0 ? qualityIssues : undefined,
      };
    }
  );

  // ============================================
  // BULK TRANSLATE
  // ============================================

  // Request schema for bulk translate
  const bulkTranslateSchema = z.object({
    keyIds: z.array(z.string()).min(1).max(100),
    targetLanguages: z.array(z.string()).optional(),
    provider: z.enum(['MT', 'AI']),
  });

  // Response schema for bulk translate (sync or async)
  const bulkTranslateResponseSchema = z.union([
    // Sync response
    z.object({
      translated: z.number(),
      skipped: z.number(),
      errors: z.array(z.object({
        keyId: z.string(),
        language: z.string(),
        error: z.string(),
      })).optional(),
    }),
    // Async response
    z.object({
      jobId: z.string(),
      async: z.literal(true),
    }),
  ]);

  /** Threshold for async processing */
  const ASYNC_THRESHOLD_KEYS = 5;
  const ASYNC_THRESHOLD_LANGS = 3;

  /**
   * POST /api/branches/:branchId/keys/bulk-translate - Bulk translate empty translations
   * Translates all empty strings for selected keys using MT or AI.
   * For large batches (>5 keys or >3 languages), returns a jobId for background processing.
   */
  app.post(
    '/api/branches/:branchId/keys/bulk-translate',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Bulk translate empty translations for selected keys. Large batches are processed in background.',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          branchId: z.string(),
        }),
        body: bulkTranslateSchema,
        response: {
          200: bulkTranslateResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params;
      const { keyIds, targetLanguages, provider } = request.body;

      // Verify branch and get project
      const projectId = await branchService.getProjectIdByBranchId(branchId);
      if (!projectId) {
        throw new NotFoundError('Branch');
      }

      // Check project membership
      const isMember = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!isMember) {
        throw new ForbiddenError('Not a member of this project');
      }

      // Get project info for default language
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      const sourceLanguage = project.defaultLanguage || 'en';

      // Get project languages for target filtering
      const projectLanguages = project.languages.map((l) => l.code);
      const targets = targetLanguages?.length
        ? targetLanguages.filter((l) => projectLanguages.includes(l) && l !== sourceLanguage)
        : projectLanguages.filter((l) => l !== sourceLanguage);

      if (targets.length === 0) {
        return { translated: 0, skipped: 0 };
      }

      // Determine if this should be async (large batch)
      const isLargeBatch = keyIds.length > ASYNC_THRESHOLD_KEYS || targets.length > ASYNC_THRESHOLD_LANGS;

      if (isLargeBatch) {
        // Queue for background processing
        const job = await mtBatchQueue.add('bulk-translate-ui', {
          type: 'bulk-translate-ui',
          projectId,
          branchId,
          userId: request.user.userId,
          keyIds,
          targetLanguages: targets,
          translationProvider: provider,
        });

        return {
          jobId: job.id!,
          async: true as const,
        };
      }

      // Fetch keys with their translations
      const keys = await fastify.prisma.translationKey.findMany({
        where: {
          id: { in: keyIds },
          branchId,
        },
        include: {
          translations: true,
        },
      });

      let translated = 0;
      let skipped = 0;
      const errors: Array<{ keyId: string; language: string; error: string }> = [];

      // Process each key
      for (const key of keys) {
        // Get source text
        const sourceTranslation = key.translations.find(
          (t) => t.language === sourceLanguage
        );
        const sourceText = sourceTranslation?.value;

        if (!sourceText || sourceText.trim() === '') {
          // No source text to translate from
          skipped += targets.length;
          continue;
        }

        // Translate to each target language
        for (const targetLang of targets) {
          // Check if translation already exists
          const existingTranslation = key.translations.find(
            (t) => t.language === targetLang
          );
          if (existingTranslation?.value && existingTranslation.value.trim() !== '') {
            // Already has a translation
            skipped++;
            continue;
          }

          try {
            let translatedText: string;

            if (provider === 'MT') {
              const result = await mtService.translateWithContext(
                projectId,
                branchId,
                key.id,
                sourceText,
                sourceLanguage,
                targetLang
              );
              translatedText = result.translatedText;
            } else {
              const result = await aiService.translate(projectId, {
                text: sourceText,
                sourceLanguage,
                targetLanguage: targetLang,
                keyId: key.id,
                branchId,
              });
              translatedText = result.text;
            }

            // Save the translation
            await translationService.setTranslation(key.id, targetLang, translatedText);
            translated++;
          } catch (error) {
            errors.push({
              keyId: key.id,
              language: targetLang,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Log activity
      if (translated > 0) {
        activityService.log({
          type: 'translation',
          projectId,
          branchId,
          userId: request.user.userId,
          metadata: {
            languages: targets,
            keyCount: keys.length,
          },
          changes: [],
        });
      }

      return {
        translated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      };
    }
  );
};

export default translationRoutes;
