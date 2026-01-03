/**
 * Quality Score Calculator
 *
 * Converts quality check issues to a numeric 0-100 score.
 * Uses weighted penalties based on issue severity and type.
 */

import type { QualityCheckResult, QualityIssue } from './types.js';

/**
 * Penalty weights by issue type
 *
 * Higher values = more severe penalty
 */
const ISSUE_WEIGHTS: Record<string, number> = {
  // Critical issues (high impact on functionality)
  length_extreme: 80, // Almost certainly wrong (AI hallucination, wrong translation)
  placeholder_missing: 30,
  icu_syntax: 25,
  length_critical: 25,

  // Major issues (medium impact)
  placeholder_extra: 15,
  glossary_missing: 15,
  punctuation_mismatch: 10,
  length_too_long: 10,

  // Minor issues (low impact - formatting/style)
  whitespace_leading: 5,
  whitespace_trailing: 5,
  whitespace_double: 3,
  whitespace_tab: 3,
};

/**
 * Severity multipliers
 *
 * Modifies the penalty weight based on severity level
 */
const SEVERITY_MULTIPLIERS: Record<string, number> = {
  error: 1.0, // Full penalty
  warning: 0.5, // Half penalty
  info: 0.1, // Minimal penalty
};

/**
 * Result of quality score calculation
 */
export interface QualityScoreResult {
  /** Overall quality score (0-100) */
  score: number;

  /** Whether the translation passed quality checks (score >= 80 and no errors) */
  passed: boolean;

  /** Whether AI evaluation is recommended for deeper analysis */
  needsAIEvaluation: boolean;

  /** Original issues from quality checks */
  issues: QualityIssue[];
}

/**
 * Calculate a numeric quality score from quality check issues
 *
 * Scoring algorithm:
 * 1. Start with perfect score (100)
 * 2. For each issue: subtract (weight × severity multiplier)
 * 3. Clamp result to 0-100 range
 * 4. Recommend AI evaluation if score < 70 or length issues found
 *
 * @param result - Result from runQualityChecks()
 * @returns Score result with 0-100 score and pass/fail status
 *
 * @example
 * const checkResult = runQualityChecks({ source: "Hello {name}!", target: "Bonjour!" });
 * const scoreResult = calculateScore(checkResult);
 * // scoreResult.score = 70 (30 points deducted for missing placeholder)
 * // scoreResult.passed = false
 * // scoreResult.needsAIEvaluation = true
 */
export function calculateScore(result: QualityCheckResult): QualityScoreResult {
  let score = 100;
  let hasLengthIssues = false;

  for (const issue of result.issues) {
    // Get weight for this issue type (default: 10 if unknown)
    const weight = ISSUE_WEIGHTS[issue.type] ?? 10;

    // Get severity multiplier (default: 0.5 for unknown severity)
    const multiplier = SEVERITY_MULTIPLIERS[issue.severity] ?? 0.5;

    // Calculate penalty and subtract from score
    const penalty = weight * multiplier;
    score -= penalty;

    // Track length issues for AI escalation
    if (issue.type === 'length_too_long' || issue.type === 'length_critical' || issue.type === 'length_extreme') {
      hasLengthIssues = true;
    }
  }

  // Clamp score to valid range
  const finalScore = Math.max(0, Math.round(score));

  // Determine if AI evaluation is needed:
  // - Low score (< 70) indicates potential quality issues
  // - Length issues may indicate translation expansion/contraction problems
  // - Either case warrants deeper semantic analysis
  const needsAI = finalScore < 70 || hasLengthIssues;

  return {
    score: finalScore,
    passed: finalScore >= 80 && !result.hasErrors,
    needsAIEvaluation: needsAI,
    issues: result.issues,
  };
}
