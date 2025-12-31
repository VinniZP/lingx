/**
 * Quality Check Types
 *
 * Type definitions for the translation quality check system.
 */

/**
 * Severity levels for quality issues
 */
export type QualityIssueSeverity = 'error' | 'warning' | 'info';

/**
 * Types of quality checks
 */
export type QualityCheckType =
  | 'placeholder_missing'
  | 'placeholder_extra'
  | 'whitespace_leading'
  | 'whitespace_trailing'
  | 'whitespace_double'
  | 'whitespace_tab'
  | 'punctuation_mismatch'
  | 'length_too_long'
  | 'length_critical';

/**
 * A single quality issue found in a translation
 */
export interface QualityIssue {
  /** Type of the issue */
  type: QualityCheckType;
  /** Severity level */
  severity: QualityIssueSeverity;
  /** Human-readable message */
  message: string;
  /** Position in target string where issue occurs (if applicable) */
  position?: {
    start: number;
    end: number;
  };
  /** Additional context data */
  context?: {
    expected?: string;
    found?: string;
    placeholder?: string;
  };
}

/**
 * Result of running quality checks on a single translation
 */
export interface QualityCheckResult {
  /** Whether any blocking errors were found */
  hasErrors: boolean;
  /** Whether any warnings were found */
  hasWarnings: boolean;
  /** List of all issues found */
  issues: QualityIssue[];
}

/**
 * Input for quality checks - source and target translation pair
 */
export interface QualityCheckInput {
  /** Source text (typically the default language) */
  source: string;
  /** Target text (the translation to validate) */
  target: string;
  /** Source language code */
  sourceLanguage?: string;
  /** Target language code */
  targetLanguage?: string;
}

/**
 * Configuration for which checks to run
 */
export interface QualityCheckConfig {
  /** Enable placeholder consistency check (default: true) */
  placeholders?: boolean;
  /** Enable whitespace check (default: true) */
  whitespace?: boolean;
  /** Enable punctuation check (default: true) */
  punctuation?: boolean;
  /** Enable length check (default: true) */
  length?: boolean;
  /** Length warning threshold as ratio of expected (default: 1.5 = 150%) */
  lengthWarningThreshold?: number;
  /** Length error threshold as ratio of expected (default: 2.0 = 200%) */
  lengthErrorThreshold?: number;
  /** Custom severity overrides by check type */
  severityOverrides?: Partial<Record<QualityCheckType, QualityIssueSeverity>>;
}

/**
 * Interface for a quality checker implementation
 */
export interface QualityChecker {
  /** Unique name of this checker */
  name: string;
  /** Run the check on input and return issues */
  check(input: QualityCheckInput): QualityIssue[];
}
