/**
 * Quality Checks Module
 *
 * Translation quality validation for placeholder consistency,
 * whitespace issues, punctuation mismatches, and length prediction.
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
export { lengthChecker, createLengthChecker, type LengthCheckOptions } from './length-check.js';
export { icuSyntaxChecker, validateICUSyntaxAsync } from './icu-syntax-check.js';

// Score calculator
export { calculateScore, type QualityScoreResult } from './score-calculator.js';

// Runner
export {
  runQualityChecks,
  runBatchQualityChecks,
  type BatchTranslationEntry,
  type BatchQualityResult,
} from './runner.js';
