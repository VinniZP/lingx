/**
 * Translation Routes
 *
 * Handles translation key and value CRUD operations.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 *
 * Routes are thin - they validate input, dispatch to CQRS bus, and format responses.
 */
import {
  batchApprovalSchema,
  batchQualityCheckResponseSchema,
  bulkDeleteKeysSchema,
  bulkDeleteResponseSchema,
  bulkUpdateTranslationsSchema,
  createKeySchema,
  keyListQuerySchema,
  keyListResponseSchema,
  namespaceListResponseSchema,
  qualityIssueSchema,
  setApprovalStatusSchema,
  setTranslationSchema,
  translationKeyResponseSchema,
  translationValueSchema,
  updateKeySchema,
  updateTranslationsSchema,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { toKeyListResultDto, toTranslationKeyDto, toTranslationValueDto } from '../dto/index.js';

// Import commands and queries
import {
  BatchApprovalCommand,
  BulkDeleteKeysCommand,
  BulkTranslateCommand,
  BulkUpdateTranslationsCommand,
  CheckBranchQualityQuery,
  CreateKeyCommand,
  DeleteKeyCommand,
  GetBranchTranslationsQuery,
  GetKeyQuery,
  ListKeysQuery,
  ListNamespacesQuery,
  SetApprovalStatusCommand,
  SetTranslationCommand,
  SetTranslationWithQualityCommand,
  UpdateKeyCommand,
  UpdateKeyTranslationsCommand,
} from '../modules/translation/index.js';

const translationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

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

      const result = await fastify.queryBus.execute(
        new ListKeysQuery(branchId, request.user.userId, {
          search,
          page,
          limit,
          filter,
          qualityFilter,
          namespace,
        })
      );

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

      const namespaces = await fastify.queryBus.execute(
        new ListNamespacesQuery(branchId, request.user.userId)
      );

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

      const key = await fastify.commandBus.execute(
        new CreateKeyCommand(
          branchId,
          name,
          namespace ?? null,
          description ?? null,
          request.user.userId
        )
      );

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

      const key = await fastify.queryBus.execute(new GetKeyQuery(id, request.user.userId));

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

      const updated = await fastify.commandBus.execute(
        new UpdateKeyCommand(id, name, namespace, description, request.user.userId)
      );

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

      await fastify.commandBus.execute(new DeleteKeyCommand(id, request.user.userId));

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

      const deleted = await fastify.commandBus.execute(
        new BulkDeleteKeysCommand(branchId, keyIds, request.user.userId)
      );

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

      const result = await fastify.commandBus.execute(
        new UpdateKeyTranslationsCommand(id, translations, request.user.userId)
      );

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

      const result = await fastify.commandBus.execute(
        new SetTranslationCommand(keyId, lang, value, request.user.userId)
      );

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

      return fastify.queryBus.execute(
        new GetBranchTranslationsQuery(branchId, request.user.userId)
      );
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

      return fastify.commandBus.execute(
        new BulkUpdateTranslationsCommand(branchId, translations, request.user.userId)
      );
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

      const result = await fastify.commandBus.execute(
        new SetApprovalStatusCommand(id, status, request.user.userId)
      );

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

      const updated = await fastify.commandBus.execute(
        new BatchApprovalCommand(branchId, translationIds, status, request.user.userId)
      );

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

      // Parse key IDs if provided
      const keyIds = keyIdsStr ? keyIdsStr.split(',').filter(Boolean) : undefined;

      const result = await fastify.queryBus.execute(
        new CheckBranchQualityQuery(branchId, request.user.userId, keyIds)
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

      const { translation, qualityIssues } = await fastify.commandBus.execute(
        new SetTranslationWithQualityCommand(keyId, lang, value, request.user.userId)
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
      errors: z
        .array(
          z.object({
            keyId: z.string(),
            language: z.string(),
            error: z.string(),
          })
        )
        .optional(),
    }),
    // Async response
    z.object({
      jobId: z.string(),
      async: z.literal(true),
    }),
  ]);

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
        description:
          'Bulk translate empty translations for selected keys. Large batches are processed in background.',
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

      return fastify.commandBus.execute(
        new BulkTranslateCommand(branchId, keyIds, targetLanguages, provider, request.user.userId)
      );
    }
  );
};

export default translationRoutes;
