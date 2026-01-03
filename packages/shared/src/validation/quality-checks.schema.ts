/**
 * Quality Check Schemas
 *
 * Zod schemas for quality check API responses.
 */

import { z } from 'zod';

/**
 * Severity levels for quality issues
 */
export const qualityIssueSeveritySchema = z.enum(['error', 'warning', 'info']);

/**
 * Types of quality checks
 */
export const qualityCheckTypeSchema = z.enum([
  // Heuristic checks
  'placeholder_missing',
  'placeholder_extra',
  'whitespace_leading',
  'whitespace_trailing',
  'whitespace_double',
  'whitespace_tab',
  'punctuation_mismatch',
  'length_too_long',
  'length_critical',
  'length_extreme', // 5x+ expected length, likely AI hallucination
  'icu_syntax',
  'glossary_missing',
  // AI evaluation issues
  'ai_accuracy',
  'ai_fluency',
  'ai_terminology',
]);

/**
 * Position in target string where issue occurs
 */
export const qualityIssuePositionSchema = z.object({
  start: z.number(),
  end: z.number(),
});

/**
 * Additional context for a quality issue
 */
export const qualityIssueContextSchema = z.object({
  expected: z.string().optional(),
  found: z.string().optional(),
  placeholder: z.string().optional(),
  ratio: z.string().optional(), // For length checks: actual/expected ratio
});

/**
 * A single quality issue found in a translation
 */
export const qualityIssueSchema = z.object({
  type: qualityCheckTypeSchema,
  severity: qualityIssueSeveritySchema,
  message: z.string(),
  position: qualityIssuePositionSchema.optional(),
  context: qualityIssueContextSchema.optional(),
});

/**
 * Result of running quality checks on a single translation
 */
export const qualityCheckResultSchema = z.object({
  hasErrors: z.boolean(),
  hasWarnings: z.boolean(),
  issues: z.array(qualityIssueSchema),
});

/**
 * Batch quality check result for a single key/language pair
 */
export const batchQualityResultSchema = z.object({
  keyName: z.string(),
  keyId: z.string().optional(),
  language: z.string(),
  result: qualityCheckResultSchema,
});

/**
 * Response for batch quality check endpoint
 */
export const batchQualityCheckResponseSchema = z.object({
  totalKeys: z.number(),
  keysWithIssues: z.number(),
  results: z.array(batchQualityResultSchema),
});

/**
 * Maximum batch size for translation IDs
 */
export const MAX_BATCH_TRANSLATION_IDS = 1000;

/**
 * Params: translationId
 */
export const translationIdParamsSchema = z.object({
  translationId: z.string(),
});

/**
 * Params: branchId
 */
export const branchIdParamsSchema = z.object({
  branchId: z.string(),
});

/**
 * Params: projectId
 */
export const projectIdParamsSchema = z.object({
  projectId: z.string(),
});

/**
 * Params: keyId
 */
export const keyIdParamsSchema = z.object({
  keyId: z.string(),
});

/**
 * Body: Evaluate single translation quality
 */
export const evaluateQualityBodySchema = z.object({
  forceAI: z.boolean().optional(),
});

/**
 * Body: Batch quality evaluation
 */
export const batchQualityBodySchema = z.object({
  translationIds: z.array(z.string()).max(MAX_BATCH_TRANSLATION_IDS).optional(),
  forceAI: z.boolean().optional(),
});

/**
 * Body: Validate ICU syntax
 */
export const validateIcuBodySchema = z.object({
  text: z.string(),
});

/**
 * Evaluation type indicating how the score was calculated
 */
export const evaluationTypeSchema = z.enum(['heuristic', 'ai', 'hybrid']);

/**
 * Response for single translation quality evaluation
 * POST /api/translations/:translationId/quality
 */
export const qualityScoreResponseSchema = z.object({
  score: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100).optional(),
  fluency: z.number().min(0).max(100).optional(),
  terminology: z.number().min(0).max(100).optional(),
  format: z.number().min(0).max(100).optional(),
  passed: z.boolean(),
  needsAIEvaluation: z.boolean(),
  issues: z.array(qualityIssueSchema),
  evaluationType: evaluationTypeSchema,
  cached: z.boolean(),
});

/**
 * Response for batch quality evaluation job
 * POST /api/branches/:branchId/quality/batch
 */
export const batchQualityJobResponseSchema = z.object({
  jobId: z.string(),
  stats: z.object({
    total: z.number(),
    cached: z.number(),
    queued: z.number(),
  }),
});

/**
 * Language-specific quality statistics
 */
export const languageQualityStatsSchema = z.object({
  average: z.number(),
  count: z.number(),
});

/**
 * Response for branch quality summary
 * GET /api/branches/:branchId/quality/summary
 */
export const branchQualitySummaryResponseSchema = z.object({
  averageScore: z.number(),
  distribution: z.object({
    excellent: z.number(),
    good: z.number(),
    needsReview: z.number(),
  }),
  byLanguage: z.record(z.string(), languageQualityStatsSchema),
  totalScored: z.number(),
  totalTranslations: z.number(),
});

/**
 * Quality scoring configuration
 * GET/PUT /api/projects/:projectId/quality/config
 */
export const qualityScoringConfigSchema = z.object({
  scoreAfterAITranslation: z.boolean(),
  scoreBeforeMerge: z.boolean(),
  autoApproveThreshold: z.number().min(0).max(100),
  flagThreshold: z.number().min(0).max(100),
  aiEvaluationEnabled: z.boolean(),
  aiEvaluationProvider: z.string().nullable(),
  aiEvaluationModel: z.string().nullable(),
});

/**
 * Request body for updating quality config (all fields optional)
 */
export const updateQualityScoringConfigSchema = qualityScoringConfigSchema.partial();

/**
 * ICU syntax validation result
 * POST /api/quality/validate-icu
 */
export const icuValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
});

/**
 * Response for key quality issues
 * GET /api/keys/:keyId/quality/issues
 */
export const keyQualityIssuesResponseSchema = z.object({
  issues: z.record(z.string(), z.array(qualityIssueSchema)),
});

export type QualityIssueSeverityDto = z.infer<typeof qualityIssueSeveritySchema>;
export type QualityCheckTypeDto = z.infer<typeof qualityCheckTypeSchema>;
export type QualityIssueDto = z.infer<typeof qualityIssueSchema>;
export type QualityCheckResultDto = z.infer<typeof qualityCheckResultSchema>;
export type BatchQualityResultDto = z.infer<typeof batchQualityResultSchema>;
export type BatchQualityCheckResponseDto = z.infer<typeof batchQualityCheckResponseSchema>;
export type EvaluationTypeDto = z.infer<typeof evaluationTypeSchema>;
export type QualityScoreResponseDto = z.infer<typeof qualityScoreResponseSchema>;
export type BatchQualityJobResponseDto = z.infer<typeof batchQualityJobResponseSchema>;
export type BranchQualitySummaryResponseDto = z.infer<typeof branchQualitySummaryResponseSchema>;
export type QualityScoringConfigDto = z.infer<typeof qualityScoringConfigSchema>;
export type ICUValidationResultDto = z.infer<typeof icuValidationResultSchema>;

export type TranslationIdParams = z.infer<typeof translationIdParamsSchema>;
export type BranchIdParams = z.infer<typeof branchIdParamsSchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamsSchema>;
export type KeyIdParams = z.infer<typeof keyIdParamsSchema>;
export type EvaluateQualityBody = z.infer<typeof evaluateQualityBodySchema>;
export type BatchQualityBody = z.infer<typeof batchQualityBodySchema>;
export type ValidateIcuBody = z.infer<typeof validateIcuBodySchema>;
export type KeyQualityIssuesResponseDto = z.infer<typeof keyQualityIssuesResponseSchema>;
