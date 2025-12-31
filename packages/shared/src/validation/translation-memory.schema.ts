import { z } from 'zod';

/**
 * Translation Memory Search Query
 */
export const tmSearchQuerySchema = z.object({
  sourceText: z.string().min(1).max(5000),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
  minSimilarity: z.coerce.number().min(0.5).max(1.0).optional(),
  limit: z.coerce.number().min(1).max(20).optional(),
});

export type TMSearchQuery = z.infer<typeof tmSearchQuerySchema>;

/**
 * Record TM Usage Input
 */
export const recordTMUsageSchema = z.object({
  entryId: z.string(),
});

export type RecordTMUsageInput = z.infer<typeof recordTMUsageSchema>;

/**
 * TM Match Response Item
 */
export const tmMatchSchema = z.object({
  id: z.string(),
  sourceText: z.string(),
  targetText: z.string(),
  similarity: z.number(),
  matchType: z.enum(['exact', 'fuzzy']),
  usageCount: z.number(),
  lastUsedAt: z.string(),
});

export type TMMatch = z.infer<typeof tmMatchSchema>;

/**
 * TM Search Response
 */
export const tmSearchResponseSchema = z.object({
  matches: z.array(tmMatchSchema),
});

export type TMSearchResponse = z.infer<typeof tmSearchResponseSchema>;

/**
 * TM Stats Response
 */
export const tmStatsResponseSchema = z.object({
  totalEntries: z.number(),
  languagePairs: z.array(
    z.object({
      sourceLanguage: z.string(),
      targetLanguage: z.string(),
      count: z.number(),
    })
  ),
});

export type TMStatsResponse = z.infer<typeof tmStatsResponseSchema>;

/**
 * Reindex Response
 */
export const tmReindexResponseSchema = z.object({
  message: z.string(),
  jobId: z.string().optional(),
});

export type TMReindexResponse = z.infer<typeof tmReindexResponseSchema>;
