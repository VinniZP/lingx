/**
 * Length Check
 *
 * Detects translations that may cause UI overflow by comparing
 * target length against expected length based on language expansion ratios.
 */

import type { QualityChecker, QualityIssue, QualityCheckInput } from './types.js';

/**
 * Language expansion/compression ratios relative to English.
 * Values > 1 mean the language typically expands.
 * Values < 1 mean the language typically compresses.
 */
const LANGUAGE_RATIOS: Record<string, number> = {
  // Expanding languages
  de: 1.35, // German expands ~35%
  fi: 1.30, // Finnish expands ~30%
  ru: 1.30, // Russian expands ~30%
  pl: 1.30, // Polish expands ~30%
  nl: 1.25, // Dutch expands ~25%
  es: 1.25, // Spanish expands ~25%
  pt: 1.20, // Portuguese expands ~20%
  fr: 1.20, // French expands ~20%
  it: 1.15, // Italian expands ~15%
  ar: 1.25, // Arabic expands ~25%
  el: 1.20, // Greek expands ~20%
  hu: 1.30, // Hungarian expands ~30%
  cs: 1.25, // Czech expands ~25%
  sv: 1.10, // Swedish expands ~10%
  da: 1.10, // Danish expands ~10%
  no: 1.10, // Norwegian expands ~10%

  // Compressing languages
  ja: 0.80, // Japanese compresses ~20%
  zh: 0.70, // Chinese compresses ~30%
  'zh-CN': 0.70,
  'zh-TW': 0.70,
  ko: 0.85, // Korean compresses ~15%
  th: 0.90, // Thai compresses ~10%
  vi: 0.95, // Vietnamese similar

  // Neutral (similar to English)
  en: 1.0,
  'en-US': 1.0,
  'en-GB': 1.0,
};

/**
 * Default thresholds for length warnings
 */
const DEFAULT_WARNING_THRESHOLD = 1.5; // 150% of expected length
const DEFAULT_ERROR_THRESHOLD = 2.0; // 200% of expected length

/**
 * Get the expected expansion ratio for a language.
 * Falls back to 1.0 (neutral) for unknown languages.
 */
function getLanguageRatio(language: string): number {
  // Try exact match first
  if (LANGUAGE_RATIOS[language]) {
    return LANGUAGE_RATIOS[language];
  }

  // Try base language code (e.g., "de" from "de-DE")
  const baseCode = language.split('-')[0].toLowerCase();
  if (LANGUAGE_RATIOS[baseCode]) {
    return LANGUAGE_RATIOS[baseCode];
  }

  // Default to neutral
  return 1.0;
}

/**
 * Calculate effective character length.
 * Accounts for ICU placeholders which shouldn't count toward display length.
 */
function getEffectiveLength(text: string): number {
  // Remove ICU placeholders from length calculation
  // {name}, {count, plural, ...}, etc.
  const withoutPlaceholders = text.replace(/\{[^}]+\}/g, '');
  return withoutPlaceholders.length;
}

export interface LengthCheckOptions {
  /** Warning threshold as ratio of expected length (default: 1.5) */
  warningThreshold?: number;
  /** Error threshold as ratio of expected length (default: 2.0) */
  errorThreshold?: number;
}

/**
 * Creates a length checker with configurable thresholds.
 */
export function createLengthChecker(options: LengthCheckOptions = {}): QualityChecker {
  const warningThreshold = options.warningThreshold ?? DEFAULT_WARNING_THRESHOLD;
  const errorThreshold = options.errorThreshold ?? DEFAULT_ERROR_THRESHOLD;

  return {
    name: 'length',

    check(input: QualityCheckInput): QualityIssue[] {
      const issues: QualityIssue[] = [];

      // Need target language to calculate expected ratio
      if (!input.targetLanguage) {
        return issues;
      }

      const sourceLength = getEffectiveLength(input.source);
      const targetLength = getEffectiveLength(input.target);

      // Skip very short strings (< 5 chars) - not meaningful
      if (sourceLength < 5) {
        return issues;
      }

      // Get expected ratio for target language
      const languageRatio = getLanguageRatio(input.targetLanguage);
      const expectedLength = sourceLength * languageRatio;

      // Calculate how much the actual length exceeds expected
      const actualRatio = targetLength / expectedLength;

      if (actualRatio >= errorThreshold) {
        const percentage = Math.round(actualRatio * 100);
        issues.push({
          type: 'length_critical',
          severity: 'error',
          message: `Translation is ${percentage}% of expected length (critical overflow risk)`,
          context: {
            expected: `~${Math.round(expectedLength)} chars`,
            found: `${targetLength} chars`,
          },
        });
      } else if (actualRatio >= warningThreshold) {
        const percentage = Math.round(actualRatio * 100);
        issues.push({
          type: 'length_too_long',
          severity: 'warning',
          message: `Translation is ${percentage}% of expected length (may overflow)`,
          context: {
            expected: `~${Math.round(expectedLength)} chars`,
            found: `${targetLength} chars`,
          },
        });
      }

      return issues;
    },
  };
}

/**
 * Default length checker instance with standard thresholds.
 */
export const lengthChecker = createLengthChecker();
