/**
 * Scoring Module
 *
 * Pure functions for quality score calculation.
 */

export {
  SCORE_WEIGHTS,
  calculateCombinedScore,
  type AIScores,
} from './combine-scores.js';

export {
  mapAIIssuesToQualityIssues,
  type AIIssue,
} from './map-ai-issues.js';

export {
  ICU_VALID_SCORE,
  ICU_INVALID_SCORE,
  buildFormatOnlyResult,
  type ICUCheckResult,
  type FormatOnlyResult,
} from './format-only-result.js';
