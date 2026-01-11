import { z } from 'zod';

/**
 * MT Provider enum
 */
export const mtProviderSchema = z.enum(['DEEPL', 'GOOGLE_TRANSLATE']);

/**
 * Save MT Configuration Input
 */
export const saveMTConfigSchema = z.object({
  provider: mtProviderSchema,
  apiKey: z.string().min(1, 'API key is required').max(200),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
});

export type SaveMTConfigInput = z.infer<typeof saveMTConfigSchema>;

/**
 * MT Config Response (with masked key)
 */
export const mtConfigResponseSchema = z.object({
  id: z.string(),
  provider: mtProviderSchema,
  keyPrefix: z.string(),
  isActive: z.boolean(),
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MTConfigResponse = z.infer<typeof mtConfigResponseSchema>;

/**
 * MT Configs List Response
 */
export const mtConfigsListResponseSchema = z.object({
  configs: z.array(mtConfigResponseSchema),
});

export type MTConfigsListResponse = z.infer<typeof mtConfigsListResponseSchema>;

/**
 * Translate Request
 */
export const translateRequestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text too long (max 10,000 characters)'),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
  provider: mtProviderSchema.optional(),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;

/**
 * Translate Response
 */
export const translateResponseSchema = z.object({
  translatedText: z.string(),
  provider: mtProviderSchema,
  cached: z.boolean(),
  characterCount: z.number(),
});

export type TranslateResponse = z.infer<typeof translateResponseSchema>;

/**
 * Multi-language Translate Request (translate one text to multiple languages)
 */
export const multiTranslateRequestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text too long (max 10,000 characters)'),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguages: z
    .array(z.string().min(2).max(10))
    .min(1, 'At least one target language')
    .max(20, 'Max 20 languages'),
  provider: mtProviderSchema.optional(),
});

export type MultiTranslateRequest = z.infer<typeof multiTranslateRequestSchema>;

/**
 * Multi-language Translate Response
 */
export const multiTranslateResponseSchema = z.object({
  translations: z.record(
    z.string(),
    z.object({
      translatedText: z.string(),
      provider: mtProviderSchema,
      cached: z.boolean(),
      characterCount: z.number(),
    })
  ),
  totalCharacters: z.number(),
});

export type MultiTranslateResponse = z.infer<typeof multiTranslateResponseSchema>;

/**
 * Batch Translate Request
 */
export const batchTranslateRequestSchema = z.object({
  keyIds: z
    .array(z.string())
    .min(1, 'At least one key required')
    .max(500, 'Max 500 keys per batch'),
  targetLanguage: z.string().min(2).max(10),
  provider: mtProviderSchema.optional(),
  overwriteExisting: z.boolean().default(false),
});

export type BatchTranslateRequest = z.infer<typeof batchTranslateRequestSchema>;

/**
 * Batch Translate Response
 */
export const batchTranslateResponseSchema = z.object({
  message: z.string(),
  jobId: z.string().optional(),
  totalKeys: z.number(),
  estimatedCharacters: z.number(),
});

export type BatchTranslateResponse = z.infer<typeof batchTranslateResponseSchema>;

/**
 * Pre-translate Request
 */
export const preTranslateRequestSchema = z.object({
  branchId: z.string(),
  targetLanguages: z.array(z.string().min(2).max(10)).min(1).max(20),
  provider: mtProviderSchema.optional(),
});

export type PreTranslateRequest = z.infer<typeof preTranslateRequestSchema>;

/**
 * Pre-translate Response
 */
export const preTranslateResponseSchema = z.object({
  message: z.string(),
  jobId: z.string(),
  totalKeys: z.number(),
  targetLanguages: z.array(z.string()),
  estimatedCharacters: z.number(),
});

export type PreTranslateResponse = z.infer<typeof preTranslateResponseSchema>;

/**
 * MT Usage Stats Response
 */
export const mtUsageStatsSchema = z.object({
  provider: mtProviderSchema,
  currentMonth: z.object({
    characterCount: z.number(),
    requestCount: z.number(),
    cachedCount: z.number(),
    estimatedCost: z.number(),
  }),
  allTime: z.object({
    characterCount: z.number(),
    requestCount: z.number(),
  }),
});

export type MTUsageStats = z.infer<typeof mtUsageStatsSchema>;

/**
 * MT Usage Response
 */
export const mtUsageResponseSchema = z.object({
  providers: z.array(mtUsageStatsSchema),
});

export type MTUsageResponse = z.infer<typeof mtUsageResponseSchema>;

/**
 * Cost Estimate Request
 */
export const costEstimateRequestSchema = z.object({
  provider: mtProviderSchema,
  characterCount: z.number().int().min(0),
});

export type CostEstimateRequest = z.infer<typeof costEstimateRequestSchema>;

/**
 * Cost Estimate Response
 */
export const costEstimateResponseSchema = z.object({
  cost: z.number(),
  currency: z.string(),
  pricePerMillion: z.number(),
});

export type CostEstimateResponse = z.infer<typeof costEstimateResponseSchema>;

/**
 * Test Connection Response
 */
export const testConnectionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type TestConnectionResponse = z.infer<typeof testConnectionResponseSchema>;

/**
 * Delete Config Params
 */
export const deleteConfigParamsSchema = z.object({
  provider: mtProviderSchema,
});

export type DeleteConfigParams = z.infer<typeof deleteConfigParamsSchema>;
