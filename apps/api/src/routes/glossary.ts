/**
 * Glossary Routes
 *
 * Thin HTTP layer for glossary/termbase operations.
 * Delegates to CommandBus and QueryBus for business logic.
 */
import {
  createGlossaryEntrySchema,
  createGlossaryTagSchema,
  glossaryEntryResponseSchema,
  glossaryExportQuerySchema,
  glossaryImportResponseSchema,
  glossaryListQuerySchema,
  glossaryListResponseSchema,
  glossarySearchQuerySchema,
  glossarySearchResponseSchema,
  glossaryStatsResponseSchema,
  glossaryTagListResponseSchema,
  updateGlossaryEntrySchema,
  updateGlossaryTagSchema,
  upsertGlossaryTranslationSchema,
  type PartOfSpeech,
} from '@lingx/shared';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  // Commands
  CreateEntryCommand,
  CreateTagCommand,
  DeleteEntryCommand,
  DeleteTagCommand,
  DeleteTranslationCommand,
  ExportGlossaryQuery,
  GetEntryQuery,
  GetStatsQuery,
  ImportGlossaryCommand,
  ListEntriesQuery,
  ListTagsQuery,
  RecordUsageCommand,
  // Queries
  SearchInTextQuery,
  UpdateEntryCommand,
  UpdateTagCommand,
  UpsertTranslationCommand,
  type GlossaryEntryWithRelations,
} from '../modules/glossary/index.js';

const projectIdParam = z.object({ projectId: z.string() });
const entryIdParam = z.object({ projectId: z.string(), entryId: z.string() });

const glossaryRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ============================================
  // SEARCH ENDPOINTS
  // ============================================

  app.get(
    '/api/projects/:projectId/glossary/search',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Search for glossary terms within source text',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        querystring: glossarySearchQuerySchema,
        response: { 200: glossarySearchResponseSchema },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { sourceText, sourceLanguage, targetLanguage, limit } = request.query;

      return fastify.queryBus.execute(
        new SearchInTextQuery(
          projectId,
          request.user.userId,
          sourceText,
          sourceLanguage,
          targetLanguage,
          limit
        )
      );
    }
  );

  // ============================================
  // CRUD ENDPOINTS
  // ============================================

  app.get(
    '/api/projects/:projectId/glossary',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List glossary entries with filtering and pagination',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        querystring: glossaryListQuerySchema,
        response: { 200: glossaryListResponseSchema },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const result = await fastify.queryBus.execute(
        new ListEntriesQuery(projectId, request.user.userId, request.query)
      );

      return {
        entries: result.entries.map(formatEntryResponse),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    }
  );

  app.post(
    '/api/projects/:projectId/glossary',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new glossary entry',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        body: createGlossaryEntrySchema,
        response: { 201: glossaryEntryResponseSchema },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;

      const entry = await fastify.commandBus.execute(
        new CreateEntryCommand(projectId, request.user.userId, request.body)
      );

      reply.status(201);
      return formatEntryResponse(entry);
    }
  );

  app.get(
    '/api/projects/:projectId/glossary/:entryId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get a glossary entry by ID',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: entryIdParam,
        response: { 200: glossaryEntryResponseSchema },
      },
    },
    async (request) => {
      const { projectId, entryId } = request.params;

      const result = await fastify.queryBus.execute(
        new GetEntryQuery(projectId, request.user.userId, entryId)
      );

      return formatEntryResponse(result.entry);
    }
  );

  app.put(
    '/api/projects/:projectId/glossary/:entryId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Update a glossary entry',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: entryIdParam,
        body: updateGlossaryEntrySchema,
        response: { 200: glossaryEntryResponseSchema },
      },
    },
    async (request) => {
      const { projectId, entryId } = request.params;

      const entry = await fastify.commandBus.execute(
        new UpdateEntryCommand(projectId, request.user.userId, entryId, request.body)
      );

      return formatEntryResponse(entry);
    }
  );

  app.delete(
    '/api/projects/:projectId/glossary/:entryId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete a glossary entry (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: entryIdParam,
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request) => {
      const { projectId, entryId } = request.params;

      return fastify.commandBus.execute(
        new DeleteEntryCommand(projectId, request.user.userId, entryId)
      );
    }
  );

  // ============================================
  // TRANSLATION ENDPOINTS
  // ============================================

  app.post(
    '/api/projects/:projectId/glossary/:entryId/translations',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Add a translation to a glossary entry',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: entryIdParam,
        body: z.object({
          targetLanguage: z.string().min(2).max(10),
          targetTerm: z.string().min(1).max(500),
          notes: z.string().max(1000).optional(),
        }),
        response: { 201: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const { projectId, entryId } = request.params;
      const { targetLanguage, targetTerm, notes } = request.body;

      const result = await fastify.commandBus.execute(
        new UpsertTranslationCommand(
          projectId,
          request.user.userId,
          entryId,
          targetLanguage,
          targetTerm,
          notes
        )
      );

      reply.status(201);
      return result;
    }
  );

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
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request) => {
      const { projectId, entryId, lang } = request.params;
      const { targetTerm, notes } = request.body;

      return fastify.commandBus.execute(
        new UpsertTranslationCommand(
          projectId,
          request.user.userId,
          entryId,
          lang,
          targetTerm,
          notes
        )
      );
    }
  );

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
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request) => {
      const { projectId, entryId, lang } = request.params;

      return fastify.commandBus.execute(
        new DeleteTranslationCommand(projectId, request.user.userId, entryId, lang)
      );
    }
  );

  // ============================================
  // USAGE TRACKING
  // ============================================

  app.post(
    '/api/projects/:projectId/glossary/:entryId/record-usage',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Record when a glossary term is applied',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: entryIdParam,
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request) => {
      const { projectId, entryId } = request.params;

      return fastify.commandBus.execute(
        new RecordUsageCommand(projectId, request.user.userId, entryId)
      );
    }
  );

  // ============================================
  // TAG ENDPOINTS
  // ============================================

  app.get(
    '/api/projects/:projectId/glossary/tags',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all glossary tags for a project',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        response: { 200: glossaryTagListResponseSchema },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return fastify.queryBus.execute(new ListTagsQuery(projectId, request.user.userId));
    }
  );

  app.post(
    '/api/projects/:projectId/glossary/tags',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new glossary tag (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
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

      const tag = await fastify.commandBus.execute(
        new CreateTagCommand(projectId, request.user.userId, name, color)
      );

      reply.status(201);
      return tag;
    }
  );

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
    async (request) => {
      const { projectId, tagId } = request.params;
      const { name, color } = request.body;

      return fastify.commandBus.execute(
        new UpdateTagCommand(projectId, request.user.userId, tagId, name, color)
      );
    }
  );

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
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request) => {
      const { projectId, tagId } = request.params;

      return fastify.commandBus.execute(
        new DeleteTagCommand(projectId, request.user.userId, tagId)
      );
    }
  );

  // ============================================
  // IMPORT / EXPORT
  // ============================================

  app.post(
    '/api/projects/:projectId/glossary/import',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Import glossary entries from CSV or TBX (MANAGER/OWNER only)',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        querystring: z.object({
          format: z.enum(['csv', 'tbx']),
          overwrite: z.coerce.boolean().optional().default(false),
        }),
        response: { 200: glossaryImportResponseSchema },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { format, overwrite } = request.query;
      const content = (request.body as string) || '';

      return fastify.commandBus.execute(
        new ImportGlossaryCommand(projectId, request.user.userId, format, content, overwrite)
      );
    }
  );

  app.get(
    '/api/projects/:projectId/glossary/export',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Export glossary entries to CSV or TBX',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        querystring: glossaryExportQuerySchema,
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { format, sourceLanguage, targetLanguages, tagIds, domain } = request.query;

      const result = await fastify.queryBus.execute(
        new ExportGlossaryQuery(
          projectId,
          request.user.userId,
          format,
          sourceLanguage,
          targetLanguages?.split(',').filter(Boolean),
          tagIds?.split(',').filter(Boolean),
          domain
        )
      );

      reply.header('Content-Type', result.contentType);
      reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);
      return result.content;
    }
  );

  // ============================================
  // STATS
  // ============================================

  app.get(
    '/api/projects/:projectId/glossary/stats',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get glossary statistics for a project',
        tags: ['Glossary'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: projectIdParam,
        response: { 200: glossaryStatsResponseSchema },
      },
    },
    async (request) => {
      const { projectId } = request.params;

      return fastify.queryBus.execute(new GetStatsQuery(projectId, request.user.userId));
    }
  );
};

// ============================================
// HELPERS
// ============================================

function formatEntryResponse(entry: GlossaryEntryWithRelations) {
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
