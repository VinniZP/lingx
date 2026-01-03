/**
 * Format-Only Result Builder
 *
 * Builds quality result when only ICU syntax can be validated (no source comparison).
 */

import type { QualityIssue } from '@lingx/shared';

/**
 * Score assigned to translations with valid ICU syntax (or no ICU)
 */
export const ICU_VALID_SCORE = 100;

/**
 * Score assigned to translations with invalid ICU syntax
 */
export const ICU_INVALID_SCORE = 50;

/**
 * ICU validation result
 */
export interface ICUCheckResult {
  valid: boolean;
  error?: string;
}

/**
 * Format-only quality result
 */
export interface FormatOnlyResult {
  score: number;
  issues: QualityIssue[];
}

/**
 * Build quality result when only ICU syntax can be validated.
 *
 * Used when there's no source text to compare against.
 * Returns perfect score (100) for valid syntax, reduced score (50) for invalid.
 *
 * @param icuCheck - ICU syntax validation result
 * @returns Score and issues for the translation
 */
export function buildFormatOnlyResult(icuCheck: ICUCheckResult): FormatOnlyResult {
  if (icuCheck.valid) {
    return {
      score: ICU_VALID_SCORE,
      issues: [],
    };
  }

  return {
    score: ICU_INVALID_SCORE,
    issues: [
      {
        type: 'icu_syntax',
        severity: 'error',
        message: icuCheck.error || 'Invalid ICU syntax',
      },
    ],
  };
}
