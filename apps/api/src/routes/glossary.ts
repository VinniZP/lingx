/**
 * Glossary Routes
 *
 * Provides endpoints for managing project glossaries/termbases.
 * Includes search, CRUD, import/export, and MT provider sync.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  glossarySearchQuerySchema,
  glossarySearchResponseSchema,
  glossaryListQuerySchema,
  glossaryListResponseSchema,
  glossaryEntryResponseSchema,
  createGlossaryEntrySchema,
  updateGlossaryEntrySchema,
  upsertGlossaryTranslationSchema,
  glossaryStatsResponseSchema,
  createGlossaryTagSchema,
  updateGlossaryTagSchema,
  glossaryTagListResponseSchema,
  glossaryImportResponseSchema,
  glossaryExportQuerySchema,
  glossarySyncRequestSchema,
  glossarySyncStatusListResponseSchema,
  type PartOfSpeech,
} from '@lingx/shared';
import { GlossaryService } from '../services/glossary.service.js';
import { ProjectService } from '../services/project.service.js';
import { glossaryQueue } from '../lib/queues.js';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';
import type { GlossaryJobData } from '../workers/glossary.worker.js';

const glossaryRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const glossaryService = new GlossaryService(fastify.prisma);
  const projectService = new ProjectService(fastify.prisma);

  // ============================================
  // SEARCH ENDPOINTS (for translation editor)
  // ============================================

  /**
   * GET /api/projects/:projectId/glossary/search - Search glossary terms in text
   */
  app.get(
    '/api/projects/:projectId/glossary/search',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Search for glossary terms within source text',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        querystring: glossarySearchQuerySchema,
        response: {
          200: glossarySearchResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const { sourceText, sourceLanguage, targetLanguage, caseSensitive, limit } =
        request.query;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      const matches = await glossaryService.searchInText({
        projectId,
        sourceText,
        sourceLanguage,
        targetLanguage,
        caseSensitive,
        limit,
      });

      return { matches };
    }
  );

  // ============================================
  // CRUD ENDPOINTS
  // ============================================

  /**
   * GET /api/projects/:projectId/glossary - List glossary entries
   */
  app.get(
    '/api/projects/:projectId/glossary',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List glossary entries with filtering and pagination',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        querystring: glossaryListQuerySchema,
        response: {
          200: glossaryListResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const query = request.query;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      const result = await glossaryService.listEntries(projectId, query);

      return {
        entries: result.entries.map(formatEntryResponse),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    }
  );

  /**
   * POST /api/projects/:projectId/glossary - Create glossary entry
   */
  app.post(
    '/api/projects/:projectId/glossary',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new glossary entry',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: createGlossaryEntrySchema,
        response: {
          201: glossaryEntryResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const input = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      const entry = await glossaryService.createEntry(
        projectId,
        input,
        request.user.userId
      );

      reply.status(201);
      return formatEntryResponse(entry);
    }
  );

  /**
   * GET /api/projects/:projectId/glossary/:entryId - Get glossary entry
   */
  app.get(
    '/api/projects/:projectId/glossary/:entryId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get a glossary entry by ID',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          entryId: z.string(),
        }),
        response: {
          200: glossaryEntryResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId, entryId } = request.params;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      const entry = await glossaryService.getEntry(entryId);
      if (!entry || entry.projectId !== projectId) {
        throw new NotFoundError('Glossary entry');
      }

      return formatEntryResponse(entry);
    }
  );

  /**
   * PUT /api/projects/:projectId/glossary/:entryId - Update glossary entry
   */
  app.put(
    '/api/projects/:projectId/glossary/:entryId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update a glossary entry',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          entryId: z.string(),
        }),
        body: updateGlossaryEntrySchema,
        response: {
          200: glossaryEntryResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId, entryId } = request.params;
      const input = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Verify entry belongs to project
      const existing = await glossaryService.getEntry(entryId);
      if (!existing || existing.projectId !== projectId) {
        throw new NotFoundError('Glossary entry');
      }

      const entry = await glossaryService.updateEntry(entryId, input);
      return formatEntryResponse(entry);
    }
  );

  /**
   * DELETE /api/projects/:projectId/glossary/:entryId - Delete glossary entry
   */
  app.delete(
    '/api/projects/:projectId/glossary/:entryId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete a glossary entry (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          entryId: z.string(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId, entryId } = request.params;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can delete glossary entries');
      }

      // Verify entry belongs to project
      const existing = await glossaryService.getEntry(entryId);
      if (!existing || existing.projectId !== projectId) {
        throw new NotFoundError('Glossary entry');
      }

      await glossaryService.deleteEntry(entryId);
      return { success: true };
    }
  );

  // ============================================
  // TRANSLATION ENDPOINTS
  // ============================================

  /**
   * POST /api/projects/:projectId/glossary/:entryId/translations - Add translation
   */
  app.post(
    '/api/projects/:projectId/glossary/:entryId/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Add a translation to a glossary entry',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          entryId: z.string(),
        }),
        body: z.object({
          targetLanguage: z.string().min(2).max(10),
          targetTerm: z.string().min(1).max(500),
          notes: z.string().max(1000).optional(),
        }),
        response: {
          201: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, reply) => {
      const { projectId, entryId } = request.params;
      const { targetLanguage, targetTerm, notes } = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Verify entry belongs to project
      const existing = await glossaryService.getEntry(entryId);
      if (!existing || existing.projectId !== projectId) {
        throw new NotFoundError('Glossary entry');
      }

      await glossaryService.upsertTranslation(entryId, targetLanguage, targetTerm, notes);
      reply.status(201);
      return { success: true };
    }
  );

  /**
   * PUT /api/projects/:projectId/glossary/:entryId/translations/:lang - Update translation
   */
  app.put(
    '/api/projects/:projectId/glossary/:entryId/translations/:lang',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update a translation for a glossary entry',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          entryId: z.string(),
          lang: z.string(),
        }),
        body: upsertGlossaryTranslationSchema,
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId, entryId, lang } = request.params;
      const { targetTerm, notes } = request.body;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Verify entry belongs to project
      const existing = await glossaryService.getEntry(entryId);
      if (!existing || existing.projectId !== projectId) {
        throw new NotFoundError('Glossary entry');
      }

      await glossaryService.upsertTranslation(entryId, lang, targetTerm, notes);
      return { success: true };
    }
  );

  /**
   * DELETE /api/projects/:projectId/glossary/:entryId/translations/:lang - Delete translation
   */
  app.delete(
    '/api/projects/:projectId/glossary/:entryId/translations/:lang',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete a translation from a glossary entry (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          entryId: z.string(),
          lang: z.string(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId, entryId, lang } = request.params;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can delete translations');
      }

      // Verify entry belongs to project
      const existing = await glossaryService.getEntry(entryId);
      if (!existing || existing.projectId !== projectId) {
        throw new NotFoundError('Glossary entry');
      }

      await glossaryService.deleteTranslation(entryId, lang);
      return { success: true };
    }
  );

  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * POST /api/projects/:projectId/glossary/:entryId/record-usage - Record usage
   */
  app.post(
    '/api/projects/:projectId/glossary/:entryId/record-usage',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Record when a glossary term is applied',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          entryId: z.string(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId, entryId } = request.params;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Queue usage recording (non-blocking)
      const job: GlossaryJobData = {
        type: 'record-usage',
        projectId,
        entryId,
      };
      await glossaryQueue.add('record-usage', job);

      return { success: true };
    }
  );

  // ============================================
  // TAG ENDPOINTS
  // ============================================

  /**
   * GET /api/projects/:projectId/glossary/tags - List tags
   */
  app.get(
    '/api/projects/:projectId/glossary/tags',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all glossary tags for a project',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: glossaryTagListResponseSchema,
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

      const tags = await glossaryService.listTags(projectId);
      return { tags };
    }
  );

  /**
   * POST /api/projects/:projectId/glossary/tags - Create tag
   */
  app.post(
    '/api/projects/:projectId/glossary/tags',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new glossary tag (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: createGlossaryTagSchema,
        response: {
          201: z.object({
            id: z.string(),
            name: z.string(),
            color: z.string().nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { name, color } = request.body;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can create tags');
      }

      const tag = await glossaryService.createTag(projectId, name, color);
      reply.status(201);
      return tag;
    }
  );

  /**
   * PUT /api/projects/:projectId/glossary/tags/:tagId - Update tag
   */
  app.put(
    '/api/projects/:projectId/glossary/tags/:tagId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update a glossary tag (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          tagId: z.string(),
        }),
        body: updateGlossaryTagSchema,
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            color: z.string().nullable(),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId, tagId } = request.params;
      const { name, color } = request.body;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can update tags');
      }

      // Verify tag belongs to project
      const tagProject = await glossaryService.getProjectIdByTagId(tagId);
      if (tagProject !== projectId) {
        throw new NotFoundError('Glossary tag');
      }

      return glossaryService.updateTag(tagId, name, color);
    }
  );

  /**
   * DELETE /api/projects/:projectId/glossary/tags/:tagId - Delete tag
   */
  app.delete(
    '/api/projects/:projectId/glossary/tags/:tagId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete a glossary tag (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          tagId: z.string(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId, tagId } = request.params;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can delete tags');
      }

      // Verify tag belongs to project
      const tagProject = await glossaryService.getProjectIdByTagId(tagId);
      if (tagProject !== projectId) {
        throw new NotFoundError('Glossary tag');
      }

      await glossaryService.deleteTag(tagId);
      return { success: true };
    }
  );

  // ============================================
  // IMPORT / EXPORT
  // ============================================

  /**
   * POST /api/projects/:projectId/glossary/import - Import glossary
   */
  app.post(
    '/api/projects/:projectId/glossary/import',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Import glossary entries from CSV or TBX (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        querystring: z.object({
          format: z.enum(['csv', 'tbx']),
          overwrite: z.coerce.boolean().optional().default(false),
        }),
        response: {
          200: glossaryImportResponseSchema,
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const { format, overwrite } = request.query;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can import glossary');
      }

      // Get file content from body (plain text)
      const content = (request.body as string) || '';

      if (!content.trim()) {
        return { imported: 0, skipped: 0, errors: ['No content provided'] };
      }

      // Process import
      const result =
        format === 'csv'
          ? await glossaryService.importFromCSV(
              projectId,
              content,
              overwrite,
              request.user.userId
            )
          : await glossaryService.importFromTBX(
              projectId,
              content,
              overwrite,
              request.user.userId
            );

      return result;
    }
  );

  /**
   * GET /api/projects/:projectId/glossary/export - Export glossary
   */
  app.get(
    '/api/projects/:projectId/glossary/export',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Export glossary entries to CSV or TBX',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        querystring: glossaryExportQuerySchema,
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { format, sourceLanguage, targetLanguages, tagIds, domain } =
        request.query;

      // Verify project access
      const hasAccess = await projectService.checkMembership(
        projectId,
        request.user.userId
      );
      if (!hasAccess) {
        throw new ForbiddenError('Access to this project is not allowed');
      }

      // Parse comma-separated lists
      const options = {
        sourceLanguage,
        targetLanguages: targetLanguages?.split(',').filter(Boolean),
        tagIds: tagIds?.split(',').filter(Boolean),
        domain,
      };

      const content =
        format === 'csv'
          ? await glossaryService.exportToCSV(projectId, options)
          : await glossaryService.exportToTBX(projectId, options);

      // Set appropriate content type
      const contentType =
        format === 'csv' ? 'text/csv' : 'application/x-tbx+xml';
      const filename = `glossary.${format}`;

      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return content;
    }
  );

  // ============================================
  // MT PROVIDER SYNC
  // ============================================

  /**
   * POST /api/projects/:projectId/glossary/sync - Sync to MT provider
   */
  app.post(
    '/api/projects/:projectId/glossary/sync',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          'Sync glossary to MT provider (DeepL/Google) for language pair (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        body: glossarySyncRequestSchema,
        response: {
          200: z.object({
            message: z.string(),
            jobId: z.string().optional(),
          }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const { provider, sourceLanguage, targetLanguage } = request.body;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can sync glossary');
      }

      // Queue sync job
      const job: GlossaryJobData = {
        type: 'sync-provider',
        projectId,
        provider,
        sourceLanguage,
        targetLanguage,
      };
      const queuedJob = await glossaryQueue.add('sync-provider', job);

      return {
        message: 'Sync job queued',
        jobId: queuedJob.id,
      };
    }
  );

  /**
   * GET /api/projects/:projectId/glossary/sync/status - Get sync status
   */
  app.get(
    '/api/projects/:projectId/glossary/sync/status',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get glossary sync status for all MT providers',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: glossarySyncStatusListResponseSchema,
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

      const syncs = await fastify.prisma.glossaryProviderSync.findMany({
        where: { projectId },
        orderBy: { lastSyncedAt: 'desc' },
      });

      return {
        syncs: syncs.map((s) => ({
          provider: s.provider,
          sourceLanguage: s.sourceLanguage,
          targetLanguage: s.targetLanguage,
          externalGlossaryId: s.externalGlossaryId,
          entriesCount: s.entriesCount,
          lastSyncedAt: s.lastSyncedAt.toISOString(),
          syncStatus: s.syncStatus as 'synced' | 'pending' | 'error',
          syncError: s.syncError,
        })),
      };
    }
  );

  /**
   * DELETE /api/projects/:projectId/glossary/sync/:provider - Delete from provider
   */
  app.delete(
    '/api/projects/:projectId/glossary/sync/:provider',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          'Remove glossary from MT provider (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
          provider: z.enum(['DEEPL', 'GOOGLE_TRANSLATE']),
        }),
        querystring: z.object({
          sourceLanguage: z.string(),
          targetLanguage: z.string(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, _reply) => {
      const { projectId, provider } = request.params;
      const { sourceLanguage, targetLanguage } = request.query;

      // Verify MANAGER/OWNER role
      const role = await projectService.getMemberRole(
        projectId,
        request.user.userId
      );
      if (!role) {
        throw new NotFoundError('Project');
      }
      if (role !== 'MANAGER' && role !== 'OWNER') {
        throw new ForbiddenError('Only MANAGER or OWNER can delete synced glossary');
      }

      // Queue delete job
      const job: GlossaryJobData = {
        type: 'delete-provider-glossary',
        projectId,
        provider,
        sourceLanguage,
        targetLanguage,
      };
      await glossaryQueue.add('delete-provider-glossary', job);

      return { success: true };
    }
  );

  // ============================================
  // STATS
  // ============================================

  /**
   * GET /api/projects/:projectId/glossary/stats - Get statistics
   */
  app.get(
    '/api/projects/:projectId/glossary/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get glossary statistics for a project',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: z.object({
          projectId: z.string(),
        }),
        response: {
          200: glossaryStatsResponseSchema,
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

      return glossaryService.getStats(projectId);
    }
  );
};

// ============================================
// HELPERS
// ============================================

/**
 * Format entry with relations for API response
 */
function formatEntryResponse(entry: {
  id: string;
  projectId: string;
  sourceTerm: string;
  sourceLanguage: string;
  context: string | null;
  notes: string | null;
  partOfSpeech: PartOfSpeech | null;
  caseSensitive: boolean;
  domain: string | null;
  usageCount: number;
  lastUsedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  translations: Array<{
    id: string;
    targetLanguage: string;
    targetTerm: string;
    notes: string | null;
  }>;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
}) {
  return {
    id: entry.id,
    sourceTerm: entry.sourceTerm,
    sourceLanguage: entry.sourceLanguage,
    context: entry.context,
    notes: entry.notes,
    partOfSpeech: entry.partOfSpeech as PartOfSpeech | null,
    caseSensitive: entry.caseSensitive,
    domain: entry.domain,
    usageCount: entry.usageCount,
    lastUsedAt: entry.lastUsedAt?.toISOString() ?? null,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    translations: entry.translations.map((t) => ({
      id: t.id,
      targetLanguage: t.targetLanguage,
      targetTerm: t.targetTerm,
      notes: t.notes,
    })),
    tags: entry.tags.map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
    })),
  };
}

export default glossaryRoutes;
