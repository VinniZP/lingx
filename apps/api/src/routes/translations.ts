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

      const deleted = await translationService.bulkDeleteKeys(branchId, keyIds);
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

      return translationService.updateKeyTranslations(id, translations);
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

      return translationService.setTranslation(keyId, lang, value);
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

      return translationService.bulkUpdateTranslations(branchId, translations);
    }
  );
};

export default translationRoutes;
