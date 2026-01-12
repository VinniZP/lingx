/**
 * Glossary Evaluator
 *
 * Validates translation against project glossary terms.
 * Checks if source glossary terms are correctly translated.
 */

import type { QualityIssue } from '@lingx/shared';
import type { QualityGlossaryRepository } from '../../repositories/glossary.repository.js';

// ============================================
// Configuration
// ============================================

/**
 * Score deduction per missing glossary term.
 * Final score = max(0, 100 - missingTerms.length * PENALTY)
 */
export const GLOSSARY_MISSING_TERM_PENALTY = 15;

/**
 * Maximum total penalty from glossary issues.
 * Prevents glossary from dominating final score.
 */
export const GLOSSARY_MAX_PENALTY = 10;

// ============================================
// Types
// ============================================

/**
 * Result of glossary evaluation
 */
export interface GlossaryResult {
  /** Whether all glossary terms are correctly translated */
  passed: boolean;
  /** Score from 0-100 based on missing terms */
  score: number;
  /** Issue describing missing terms (if any) */
  issue?: QualityIssue;
}

/**
 * Glossary term with translations (for testing/mocking)
 */
export interface GlossaryTerm {
  sourceTerm: string;
  translations: Array<{
    targetTerm: string;
  }>;
}

// ============================================
// Glossary Evaluator Class
// ============================================

/**
 * Evaluates translations against project glossary.
 *
 * Checks:
 * 1. Which glossary source terms appear in the source text
 * 2. Whether corresponding target terms appear in the translation
 *
 * @example
 * const evaluator = new GlossaryEvaluator(repository);
 * const result = await evaluator.evaluate(
 *   'project-123',
 *   'Save the document',
 *   'Dokument speichern',
 *   'de'
 * );
 * // { passed: true, score: 100 }
 */
export class GlossaryEvaluator {
  constructor(private qualityGlossaryRepository: QualityGlossaryRepository) {}

  /**
   * Evaluate translation against project glossary.
   *
   * @param projectId - Project ID to fetch glossary from
   * @param source - Source text (original language)
   * @param target - Target text (translation)
   * @param targetLocale - Target language code
   * @returns GlossaryResult or null if no glossary terms found
   */
  async evaluate(
    projectId: string,
    source: string,
    target: string,
    targetLocale: string
  ): Promise<GlossaryResult | null> {
    // Get glossary terms for this project via repository
    const glossaryTerms = await this.qualityGlossaryRepository.findTermsWithTranslations(
      projectId,
      targetLocale
    );

    return this.evaluateWithTerms(glossaryTerms, source, target);
  }

  /**
   * Evaluate translation against provided glossary terms.
   * Useful for testing without database access.
   *
   * @param glossaryTerms - Array of glossary terms to check
   * @param source - Source text
   * @param target - Target text
   * @returns GlossaryResult or null if no relevant terms
   */
  evaluateWithTerms(
    glossaryTerms: GlossaryTerm[],
    source: string,
    target: string
  ): GlossaryResult | null {
    if (glossaryTerms.length === 0) return null;

    // Check which source terms appear in the source text
    const relevantTerms = glossaryTerms.filter((term) =>
      source.toLowerCase().includes(term.sourceTerm.toLowerCase())
    );

    if (relevantTerms.length === 0) return null;

    // Check if target translations are present in target text
    const missingTerms = relevantTerms.filter((term) => {
      const targetTerm = term.translations[0]?.targetTerm;
      return targetTerm && !target.toLowerCase().includes(targetTerm.toLowerCase());
    });

    if (missingTerms.length === 0) {
      return { passed: true, score: 100 };
    }

    const score = Math.max(0, 100 - missingTerms.length * GLOSSARY_MISSING_TERM_PENALTY);

    return {
      passed: false,
      score,
      issue: {
        type: 'glossary_missing',
        severity: 'warning',
        message: `Missing glossary terms: ${missingTerms.map((t) => t.translations[0]?.targetTerm || t.sourceTerm).join(', ')}`,
      },
    };
  }

  /**
   * Calculate score penalty for glossary issues.
   * Capped at GLOSSARY_MAX_PENALTY to prevent dominating final score.
   *
   * @param glossaryResult - Result from evaluate()
   * @returns Score penalty to subtract from final score
   */
  static calculatePenalty(glossaryResult: GlossaryResult | null): number {
    if (!glossaryResult || glossaryResult.passed) return 0;
    return Math.min(GLOSSARY_MAX_PENALTY, 100 - glossaryResult.score);
  }
}
