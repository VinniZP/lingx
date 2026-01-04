import { z } from 'zod';

/**
 * Relationship Type (matches Prisma enum)
 */
export const relationshipTypeSchema = z.enum([
  'SAME_FILE',
  'SAME_COMPONENT',
  'SEMANTIC',
  'NEARBY',
  'KEY_PATTERN',
]);

export type RelationshipType = z.infer<typeof relationshipTypeSchema>;

/**
 * Key Context Input - source location metadata from CLI extraction
 */
export const keyContextInputSchema = z.object({
  name: z.string().min(1).max(500),
  namespace: z.string().max(100).nullable().optional(),
  sourceFile: z.string().max(500).optional(),
  sourceLine: z.number().int().positive().optional(),
  sourceComponent: z.string().max(200).optional(),
});

export type KeyContextInput = z.infer<typeof keyContextInputSchema>;

/**
 * Bulk Key Context Input - batch update from CLI
 */
export const bulkKeyContextSchema = z.object({
  keys: z.array(keyContextInputSchema).min(1).max(1000),
});

export type BulkKeyContextInput = z.infer<typeof bulkKeyContextSchema>;

/**
 * Bulk Context Update Response
 */
export const bulkContextUpdateResponseSchema = z.object({
  updated: z.number(),
  notFound: z.number(),
});

export type BulkContextUpdateResponse = z.infer<typeof bulkContextUpdateResponseSchema>;

/**
 * Translation in Related Key
 */
export const relatedKeyTranslationSchema = z.object({
  language: z.string(),
  value: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type RelatedKeyTranslation = z.infer<typeof relatedKeyTranslationSchema>;

/**
 * Related Key - single related key in response
 */
export const relatedKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  namespace: z.string().nullable(),
  relationshipType: relationshipTypeSchema,
  confidence: z.number().min(0).max(1),
  sourceFile: z.string().nullable().optional(),
  sourceComponent: z.string().nullable().optional(),
  translations: z.array(relatedKeyTranslationSchema).optional(),
});

export type RelatedKey = z.infer<typeof relatedKeySchema>;

/**
 * Related Keys Response - grouped by relationship type
 */
export const relatedKeysResponseSchema = z.object({
  key: z.object({
    id: z.string(),
    name: z.string(),
    namespace: z.string().nullable(),
  }),
  relationships: z.object({
    sameFile: z.array(relatedKeySchema),
    sameComponent: z.array(relatedKeySchema),
    semantic: z.array(relatedKeySchema),
    nearby: z.array(relatedKeySchema),
    keyPattern: z.array(relatedKeySchema),
  }),
});

export type RelatedKeysResponse = z.infer<typeof relatedKeysResponseSchema>;

/**
 * Related Keys Query Parameters
 */
export const relatedKeysQuerySchema = z.object({
  types: z.string().optional(), // comma-separated: "SAME_FILE,SAME_COMPONENT,SEMANTIC,NEARBY,KEY_PATTERN"
  limit: z.coerce.number().min(1).max(50).default(10),
  includeTranslations: z.coerce.boolean().default(true),
});

export type RelatedKeysQuery = z.infer<typeof relatedKeysQuerySchema>;

/**
 * AI Context - related translations for AI translation assistance
 */
export const aiContextTranslationSchema = z.object({
  keyName: z.string(),
  translations: z.record(z.string(), z.string()),
  relationshipType: relationshipTypeSchema,
  confidence: z.number(),
});

export type AIContextTranslation = z.infer<typeof aiContextTranslationSchema>;

/**
 * Suggested Term from related translations
 */
export const suggestedTermSchema = z.object({
  term: z.string(),
  translation: z.string(),
  source: z.enum(['glossary', 'related']),
});

export type SuggestedTerm = z.infer<typeof suggestedTermSchema>;

/**
 * AI Context Response - for translation UI
 */
export const aiContextResponseSchema = z.object({
  relatedTranslations: z.array(aiContextTranslationSchema),
  suggestedTerms: z.array(suggestedTermSchema),
  contextPrompt: z.string(),
});

export type AIContextResponse = z.infer<typeof aiContextResponseSchema>;

/**
 * AI Context Query Parameters
 */
export const aiContextQuerySchema = z.object({
  targetLanguage: z.string().min(2).max(10),
});

export type AIContextQuery = z.infer<typeof aiContextQuerySchema>;

/**
 * Analyze Relationships Input - trigger relationship analysis
 */
export const analyzeRelationshipsSchema = z.object({
  types: z.array(relationshipTypeSchema).optional(),
  keyIds: z.array(z.string()).optional(),
  minSimilarity: z.number().min(0.5).max(1.0).default(0.7),
});

export type AnalyzeRelationshipsInput = z.infer<typeof analyzeRelationshipsSchema>;

/**
 * Analyze Relationships Response
 */
export const analyzeRelationshipsResponseSchema = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
});

export type AnalyzeRelationshipsResponse = z.infer<typeof analyzeRelationshipsResponseSchema>;

/**
 * Batch Context Translate Input
 */
export const batchContextTranslateSchema = z.object({
  keyIds: z.array(z.string()).min(1).max(50),
  targetLanguage: z.string().min(2).max(10),
  provider: z.enum(['DEEPL', 'GOOGLE']).optional(),
  useSharedContext: z.boolean().default(true),
});

export type BatchContextTranslateInput = z.infer<typeof batchContextTranslateSchema>;

/**
 * Batch Context Translate Response
 */
export const batchContextTranslateResponseSchema = z.object({
  translations: z.array(
    z.object({
      keyId: z.string(),
      translatedText: z.string(),
      cached: z.boolean(),
    })
  ),
  totalCharacters: z.number(),
  contextUsed: z.boolean(),
});

export type BatchContextTranslateResponse = z.infer<typeof batchContextTranslateResponseSchema>;
