/**
 * Translation Routes
 *
 * Handles translation key and value CRUD operations.
 * Per Design Doc: AC-WEB-007 through AC-WEB-011
 */
import { FastifyPluginAsync } from 'fastify';
import { TranslationService } from '../services/translation.service.js';
import { ProjectService } from '../services/project.service.js';
import { BranchService } from '../services/branch.service.js';
import { ActivityService } from '../services/activity.service.js';
import {
  createKeySchema,
  updateKeySchema,
  keyListSchema,
  keyWithTranslationsSchema,
  updateTranslationsSchema,
  setTranslationSchema,
  bulkDeleteSchema,
  branchTranslationsSchema,
  bulkUpdateTranslationsSchema,
} from '../schemas/translation.schema.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

const translationRoutes: FastifyPluginAsync = async (fastify) => {
  const translationService = new TranslationService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);
  const branchService = new BranchService(fastify.prisma);
  const activityService = new ActivityService(fastify.prisma);

  /**
   * GET /api/branches/:branchId/keys - List keys with pagination and search
   */
  fastify.get(
    '/api/branches/:branchId/keys',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List translation keys with pagination and search',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            branchId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 50, maximum: 100 },
          },
        },
        ...keyListSchema,
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params as { branchId: string };
      const { search, page, limit } = request.query as {
        search?: string;
        page?: number;
        limit?: number;
      };

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

      return translationService.findKeysByBranchId(branchId, {
        search,
        page,
        limit,
      });
    }
  );

  /**
   * POST /api/branches/:branchId/keys - Create new key
   */
  fastify.post(
    '/api/branches/:branchId/keys',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new translation key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            branchId: { type: 'string' },
          },
        },
        ...createKeySchema,
      },
    },
    async (request, reply) => {
      const { branchId } = request.params as { branchId: string };
      const { name, description } = request.body as {
        name: string;
        description?: string;
      };

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

      return reply.status(201).send(key);
    }
  );

  /**
   * GET /api/keys/:id - Get key with translations
   */
  fastify.get(
    '/api/keys/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get translation key with all translations',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: keyWithTranslationsSchema,
        },
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };

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

      return key;
    }
  );

  /**
   * PUT /api/keys/:id - Update key
   */
  fastify.put(
    '/api/keys/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update translation key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        ...updateKeySchema,
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };
      const input = request.body as { name?: string; description?: string };

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

      return translationService.updateKey(id, input);
    }
  );

  /**
   * DELETE /api/keys/:id - Delete key
   */
  fastify.delete(
    '/api/keys/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete translation key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
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
  fastify.post(
    '/api/branches/:branchId/keys/bulk-delete',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Bulk delete translation keys',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            branchId: { type: 'string' },
          },
        },
        ...bulkDeleteSchema,
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params as { branchId: string };
      const { keyIds } = request.body as { keyIds: string[] };

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
  fastify.put(
    '/api/keys/:id/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update translations for a key',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        ...updateTranslationsSchema,
      },
    },
    async (request, _reply) => {
      const { id } = request.params as { id: string };
      const { translations } = request.body as {
        translations: Record<string, string>;
      };

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

      return result;
    }
  );

  /**
   * PUT /api/keys/:keyId/translations/:lang - Set single translation
   */
  fastify.put(
    '/api/keys/:keyId/translations/:lang',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Set translation for a specific language',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            keyId: { type: 'string' },
            lang: { type: 'string' },
          },
        },
        ...setTranslationSchema,
      },
    },
    async (request, _reply) => {
      const { keyId, lang } = request.params as { keyId: string; lang: string };
      const { value } = request.body as { value: string };

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

      return result;
    }
  );

  /**
   * GET /api/branches/:branchId/translations - Get all translations (for CLI)
   */
  fastify.get(
    '/api/branches/:branchId/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get all translations for a branch (CLI pull)',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            branchId: { type: 'string' },
          },
        },
        ...branchTranslationsSchema,
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params as { branchId: string };

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
  fastify.put(
    '/api/branches/:branchId/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Bulk update translations for a branch (CLI push)',
        tags: ['Translations'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            branchId: { type: 'string' },
          },
        },
        ...bulkUpdateTranslationsSchema,
      },
    },
    async (request, _reply) => {
      const { branchId } = request.params as { branchId: string };
      const { translations } = request.body as {
        translations: Record<string, Record<string, string>>;
      };

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
};

export default translationRoutes;
