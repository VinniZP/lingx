/**
 * Quality Checks Module
 *
 * Translation quality validation for placeholder consistency,
 * whitespace issues, and punctuation mismatches.
 */

// Types
export type {
  QualityIssueSeverity,
  QualityCheckType,
  QualityIssue,
  QualityCheckResult,
  QualityCheckInput,
  QualityCheckConfig,
  QualityChecker,
} from './types.js';

// Individual checkers
export { placeholderChecker, extractPlaceholders } from './placeholder-check.js';
export { whitespaceChecker } from './whitespace-check.js';
export { punctuationChecker } from './punctuation-check.js';

// Runner
export {
  runQualityChecks,
  runBatchQualityChecks,
  type BatchTranslationEntry,
  type BatchQualityResult,
} from './runner.js';
