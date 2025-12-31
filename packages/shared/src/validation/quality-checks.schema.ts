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
  'placeholder_missing',
  'placeholder_extra',
  'whitespace_leading',
  'whitespace_trailing',
  'whitespace_double',
  'whitespace_tab',
  'punctuation_mismatch',
  'length_too_long',
  'length_critical',
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

// Type exports
export type QualityIssueSeverityDto = z.infer<typeof qualityIssueSeveritySchema>;
export type QualityCheckTypeDto = z.infer<typeof qualityCheckTypeSchema>;
export type QualityIssueDto = z.infer<typeof qualityIssueSchema>;
export type QualityCheckResultDto = z.infer<typeof qualityCheckResultSchema>;
export type BatchQualityResultDto = z.infer<typeof batchQualityResultSchema>;
export type BatchQualityCheckResponseDto = z.infer<typeof batchQualityCheckResponseSchema>;
