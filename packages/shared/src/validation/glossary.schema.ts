import { z } from 'zod';

/**
 * Part of Speech enum
 */
export const partOfSpeechSchema = z.enum([
  'NOUN',
  'VERB',
  'ADJECTIVE',
  'ADVERB',
  'PRONOUN',
  'PREPOSITION',
  'CONJUNCTION',
  'INTERJECTION',
  'DETERMINER',
  'OTHER',
]);

export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

/**
 * Glossary Translation Input (for creating entries with translations)
 */
export const glossaryTranslationInputSchema = z.object({
  targetLanguage: z.string().min(2).max(10),
  targetTerm: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});

export type GlossaryTranslationInput = z.infer<typeof glossaryTranslationInputSchema>;

/**
 * Create Glossary Entry
 */
export const createGlossaryEntrySchema = z.object({
  sourceTerm: z.string().min(1).max(500),
  sourceLanguage: z.string().min(2).max(10),
  context: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  partOfSpeech: partOfSpeechSchema.optional(),
  caseSensitive: z.boolean().optional().default(false),
  domain: z.string().max(100).optional(),
  translations: z.array(glossaryTranslationInputSchema).optional(),
  tagIds: z.array(z.string()).optional(),
});

export type CreateGlossaryEntryInput = z.infer<typeof createGlossaryEntrySchema>;

/**
 * Update Glossary Entry
 */
export const updateGlossaryEntrySchema = z.object({
  sourceTerm: z.string().min(1).max(500).optional(),
  context: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  partOfSpeech: partOfSpeechSchema.optional().nullable(),
  caseSensitive: z.boolean().optional(),
  domain: z.string().max(100).optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

export type UpdateGlossaryEntryInput = z.infer<typeof updateGlossaryEntrySchema>;

/**
 * Add/Update Glossary Translation
 */
export const upsertGlossaryTranslationSchema = z.object({
  targetTerm: z.string().min(1).max(500),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpsertGlossaryTranslationInput = z.infer<typeof upsertGlossaryTranslationSchema>;

/**
 * Glossary Search Query (for translation editor - find terms in text)
 */
export const glossarySearchQuerySchema = z.object({
  sourceText: z.string().min(1).max(5000),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
  caseSensitive: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export type GlossarySearchQuery = z.infer<typeof glossarySearchQuerySchema>;

/**
 * Glossary List Query (for management page)
 */
export const glossaryListQuerySchema = z.object({
  search: z.string().optional(),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
  partOfSpeech: partOfSpeechSchema.optional(),
  domain: z.string().optional(),
  tagId: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

export type GlossaryListQuery = z.infer<typeof glossaryListQuerySchema>;

/**
 * Glossary Match Response (search result)
 */
export const glossaryMatchSchema = z.object({
  id: z.string(),
  sourceTerm: z.string(),
  targetTerm: z.string(),
  context: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  partOfSpeech: partOfSpeechSchema.optional().nullable(),
  caseSensitive: z.boolean(),
  domain: z.string().optional().nullable(),
  matchType: z.enum(['exact', 'partial']),
  usageCount: z.number(),
});

export type GlossaryMatch = z.infer<typeof glossaryMatchSchema>;

/**
 * Glossary Search Response
 */
export const glossarySearchResponseSchema = z.object({
  matches: z.array(glossaryMatchSchema),
});

export type GlossarySearchResponse = z.infer<typeof glossarySearchResponseSchema>;

/**
 * Glossary Translation Response
 */
export const glossaryTranslationResponseSchema = z.object({
  id: z.string(),
  targetLanguage: z.string(),
  targetTerm: z.string(),
  notes: z.string().optional().nullable(),
});

export type GlossaryTranslationResponse = z.infer<typeof glossaryTranslationResponseSchema>;

/**
 * Glossary Tag Response
 */
export const glossaryTagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional().nullable(),
});

export type GlossaryTagResponse = z.infer<typeof glossaryTagResponseSchema>;

/**
 * Glossary Entry Response (full entry with translations and tags)
 */
export const glossaryEntryResponseSchema = z.object({
  id: z.string(),
  sourceTerm: z.string(),
  sourceLanguage: z.string(),
  context: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  partOfSpeech: partOfSpeechSchema.optional().nullable(),
  caseSensitive: z.boolean(),
  domain: z.string().optional().nullable(),
  usageCount: z.number(),
  lastUsedAt: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(glossaryTranslationResponseSchema),
  tags: z.array(glossaryTagResponseSchema),
});

export type GlossaryEntryResponse = z.infer<typeof glossaryEntryResponseSchema>;

/**
 * Glossary List Response (paginated)
 */
export const glossaryListResponseSchema = z.object({
  entries: z.array(glossaryEntryResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type GlossaryListResponse = z.infer<typeof glossaryListResponseSchema>;

/**
 * Glossary Stats Response
 */
export const glossaryStatsResponseSchema = z.object({
  totalEntries: z.number(),
  totalTranslations: z.number(),
  languagePairs: z.array(
    z.object({
      sourceLanguage: z.string(),
      targetLanguage: z.string(),
      count: z.number(),
    })
  ),
  topDomains: z.array(
    z.object({
      domain: z.string(),
      count: z.number(),
    })
  ),
  topTags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      count: z.number(),
    })
  ),
});

export type GlossaryStatsResponse = z.infer<typeof glossaryStatsResponseSchema>;

/**
 * Create Glossary Tag
 */
export const createGlossaryTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export type CreateGlossaryTagInput = z.infer<typeof createGlossaryTagSchema>;

/**
 * Update Glossary Tag
 */
export const updateGlossaryTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
});

export type UpdateGlossaryTagInput = z.infer<typeof updateGlossaryTagSchema>;

/**
 * Glossary Tag List Response
 */
export const glossaryTagListResponseSchema = z.object({
  tags: z.array(
    glossaryTagResponseSchema.extend({
      entryCount: z.number(),
    })
  ),
});

export type GlossaryTagListResponse = z.infer<typeof glossaryTagListResponseSchema>;

/**
 * Record Glossary Usage Input
 */
export const recordGlossaryUsageSchema = z.object({
  entryId: z.string(),
});

export type RecordGlossaryUsageInput = z.infer<typeof recordGlossaryUsageSchema>;

/**
 * Glossary Import Input
 */
export const glossaryImportSchema = z.object({
  format: z.enum(['csv', 'tbx']),
  overwriteExisting: z.boolean().optional().default(false),
});

export type GlossaryImportInput = z.infer<typeof glossaryImportSchema>;

/**
 * Glossary Import Response
 */
export const glossaryImportResponseSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  errors: z.array(z.string()),
  jobId: z.string().optional(),
});

export type GlossaryImportResponse = z.infer<typeof glossaryImportResponseSchema>;

/**
 * Glossary Export Query
 */
export const glossaryExportQuerySchema = z.object({
  format: z.enum(['csv', 'tbx']),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguages: z.string().optional(), // Comma-separated list
  tagIds: z.string().optional(), // Comma-separated list
  domain: z.string().optional(),
});

export type GlossaryExportQuery = z.infer<typeof glossaryExportQuerySchema>;

/**
 * Glossary Sync Request (sync to MT provider)
 * Uses mtProviderSchema from machine-translation.schema.ts
 */
export const glossarySyncRequestSchema = z.object({
  provider: z.enum(['DEEPL', 'GOOGLE_TRANSLATE']),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
});

export type GlossarySyncRequest = z.infer<typeof glossarySyncRequestSchema>;

/**
 * Glossary Sync Status Response
 */
export const glossarySyncStatusSchema = z.object({
  provider: z.enum(['DEEPL', 'GOOGLE_TRANSLATE']),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  externalGlossaryId: z.string(),
  entriesCount: z.number(),
  lastSyncedAt: z.string(),
  syncStatus: z.enum(['synced', 'pending', 'error']),
  syncError: z.string().optional().nullable(),
});

export type GlossarySyncStatus = z.infer<typeof glossarySyncStatusSchema>;

/**
 * Glossary Sync Status List Response
 */
export const glossarySyncStatusListResponseSchema = z.object({
  syncs: z.array(glossarySyncStatusSchema),
});

export type GlossarySyncStatusListResponse = z.infer<typeof glossarySyncStatusListResponseSchema>;
