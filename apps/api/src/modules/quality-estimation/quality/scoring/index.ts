/**
 * Scoring Module
 *
 * Pure functions for quality score calculation.
 */

export { SCORE_WEIGHTS, calculateCombinedScore, type AIScores } from './combine-scores.js';

export { mapAIIssuesToQualityIssues, type AIIssue } from './map-ai-issues.js';

export {
  ICU_INVALID_SCORE,
  ICU_VALID_SCORE,
  buildFormatOnlyResult,
  type FormatOnlyResult,
  type ICUCheckResult,
} from './format-only-result.js';
