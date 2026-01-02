import { z } from 'zod';

/**
 * AI Provider enum
 */
export const aiProviderSchema = z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE_AI', 'MISTRAL']);

export type AIProviderType = z.infer<typeof aiProviderSchema>;

/**
 * Save AI Configuration Input
 * Note: apiKey is optional for updates (to change model/isActive without re-entering key)
 */
export const saveAIConfigSchema = z.object({
  provider: aiProviderSchema,
  apiKey: z.string().max(200).optional(),
  model: z.string().min(1, 'Model is required').max(100),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
});

export type SaveAIConfigInput = z.infer<typeof saveAIConfigSchema>;

/**
 * AI Config Response (with masked key)
 */
export const aiConfigResponseSchema = z.object({
  id: z.string(),
  provider: aiProviderSchema,
  model: z.string(),
  keyPrefix: z.string(),
  isActive: z.boolean(),
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AIConfigResponse = z.infer<typeof aiConfigResponseSchema>;

/**
 * AI Configs List Response
 */
export const aiConfigsListResponseSchema = z.object({
  configs: z.array(aiConfigResponseSchema),
});

export type AIConfigsListResponse = z.infer<typeof aiConfigsListResponseSchema>;

/**
 * AI Context Configuration
 */
export const aiContextConfigSchema = z.object({
  includeGlossary: z.boolean().default(true),
  glossaryLimit: z.number().int().min(1).max(50).default(10),
  includeTM: z.boolean().default(true),
  tmLimit: z.number().int().min(1).max(20).default(5),
  tmMinSimilarity: z.number().min(0).max(1).default(0.7),
  includeRelatedKeys: z.boolean().default(true),
  relatedKeysLimit: z.number().int().min(1).max(20).default(5),
  includeDescription: z.boolean().default(true),
  customInstructions: z.string().max(2000).nullable().optional(),
});

export type AIContextConfig = z.infer<typeof aiContextConfigSchema>;

/**
 * AI Translate Request
 */
export const aiTranslateRequestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text too long (max 10,000 characters)'),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
  keyId: z.string().optional(),
  branchId: z.string().optional(),
  provider: aiProviderSchema.optional(),
});

export type AITranslateRequest = z.infer<typeof aiTranslateRequestSchema>;

/**
 * AI Translate Response
 */
export const aiTranslateResponseSchema = z.object({
  text: z.string(),
  provider: aiProviderSchema,
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cached: z.boolean(),
  context: z.object({
    glossaryTerms: z.number(),
    tmMatches: z.number(),
    relatedKeys: z.number(),
  }).optional(),
});

export type AITranslateResponse = z.infer<typeof aiTranslateResponseSchema>;

/**
 * AI Usage Stats
 */
export const aiUsageStatsSchema = z.object({
  provider: aiProviderSchema,
  model: z.string(),
  currentMonth: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    requestCount: z.number(),
    cacheHits: z.number(),
    estimatedCost: z.number(),
  }),
  allTime: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    requestCount: z.number(),
  }),
});

export type AIUsageStats = z.infer<typeof aiUsageStatsSchema>;

/**
 * AI Usage Response
 */
export const aiUsageResponseSchema = z.object({
  providers: z.array(aiUsageStatsSchema),
});

export type AIUsageResponse = z.infer<typeof aiUsageResponseSchema>;

/**
 * Test Connection Response
 */
export const aiTestConnectionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type AITestConnectionResponse = z.infer<typeof aiTestConnectionResponseSchema>;

/**
 * Supported Models Response
 */
export const aiSupportedModelsResponseSchema = z.object({
  models: z.array(z.string()),
});

export type AISupportedModelsResponse = z.infer<typeof aiSupportedModelsResponseSchema>;
