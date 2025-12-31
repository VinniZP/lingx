/**
 * Quality Check Runner
 *
 * Orchestrates running quality checks on translations.
 */

import type {
  QualityCheckInput,
  QualityCheckResult,
  QualityCheckConfig,
  QualityChecker,
  QualityIssue,
} from './types.js';
import { placeholderChecker } from './placeholder-check.js';
import { whitespaceChecker } from './whitespace-check.js';
import { punctuationChecker } from './punctuation-check.js';
import { lengthChecker, createLengthChecker } from './length-check.js';

/**
 * Default configuration - all checks enabled
 */
const DEFAULT_CONFIG: QualityCheckConfig = {
  placeholders: true,
  whitespace: true,
  punctuation: true,
  length: true,
};

/**
 * Map of check names to checker implementations
 */
const CHECKERS: Record<string, QualityChecker> = {
  placeholders: placeholderChecker,
  whitespace: whitespaceChecker,
  punctuation: punctuationChecker,
  length: lengthChecker,
};

/**
 * Runs quality checks on a single source/target pair
 *
 * @param input - Source and target text to check
 * @param config - Which checks to run (default: all enabled)
 * @returns Quality check result with all issues found
 *
 * @example
 * const result = runQualityChecks({
 *   source: "Hello {name}!",
 *   target: "Bonjour {nom}!",
 * });
 * // result.issues[0] = { type: 'placeholder_missing', message: 'Missing placeholder: {name}' }
 */
export function runQualityChecks(
  input: QualityCheckInput,
  config: QualityCheckConfig = DEFAULT_CONFIG
): QualityCheckResult {
  const issues: QualityIssue[] = [];

  // Skip if target is empty
  if (!input.target || !input.target.trim()) {
    return { hasErrors: false, hasWarnings: false, issues: [] };
  }

  // Skip if source is empty (nothing to compare against)
  if (!input.source || !input.source.trim()) {
    return { hasErrors: false, hasWarnings: false, issues: [] };
  }

  // Run enabled checkers
  for (const [key, checker] of Object.entries(CHECKERS)) {
    const configKey = key as keyof QualityCheckConfig;
    if (config[configKey] !== false) {
      // Special handling for length checker with custom thresholds
      let activeChecker = checker;
      if (key === 'length' && (config.lengthWarningThreshold || config.lengthErrorThreshold)) {
        activeChecker = createLengthChecker({
          warningThreshold: config.lengthWarningThreshold,
          errorThreshold: config.lengthErrorThreshold,
        });
      }

      const checkerIssues = activeChecker.check(input);

      // Apply severity overrides if configured
      if (config.severityOverrides) {
        for (const issue of checkerIssues) {
          const override = config.severityOverrides[issue.type];
          if (override) {
            issue.severity = override;
          }
        }
      }

      issues.push(...checkerIssues);
    }
  }

  return {
    hasErrors: issues.some((i) => i.severity === 'error'),
    hasWarnings: issues.some((i) => i.severity === 'warning'),
    issues,
  };
}

/**
 * Translation entry for batch processing
 */
export interface BatchTranslationEntry {
  /** Key name/identifier */
  keyName: string;
  /** Key ID (optional) */
  keyId?: string;
  /** Source text in default language */
  sourceText: string;
  /** Translations by language code */
  translations: Record<string, string>;
}

/**
 * Result of batch quality checks
 */
export interface BatchQualityResult {
  /** Key name */
  keyName: string;
  /** Key ID (if provided) */
  keyId?: string;
  /** Language code */
  language: string;
  /** Quality check result */
  result: QualityCheckResult;
}

/**
 * Batch run quality checks on multiple translations
 *
 * @param translations - Array of translation entries to check
 * @param sourceLanguage - Source language code to compare against
 * @param config - Which checks to run
 * @returns Array of results for translations with issues
 *
 * @example
 * const results = runBatchQualityChecks([
 *   {
 *     keyName: 'welcome.message',
 *     sourceText: 'Hello {name}!',
 *     translations: { en: 'Hello {name}!', de: 'Hallo {name}!', fr: 'Bonjour!' }
 *   }
 * ], 'en');
 * // results[0] = { keyName: 'welcome.message', language: 'fr', result: { issues: [...] } }
 */
export function runBatchQualityChecks(
  translations: BatchTranslationEntry[],
  sourceLanguage: string,
  config?: QualityCheckConfig
): BatchQualityResult[] {
  const results: BatchQualityResult[] = [];

  for (const entry of translations) {
    for (const [targetLang, targetText] of Object.entries(entry.translations)) {
      // Skip source language
      if (targetLang === sourceLanguage) continue;

      // Skip empty translations
      if (!targetText || !targetText.trim()) continue;

      const result = runQualityChecks(
        {
          source: entry.sourceText,
          target: targetText,
          sourceLanguage,
          targetLanguage: targetLang,
        },
        config
      );

      // Only include if there are issues
      if (result.issues.length > 0) {
        results.push({
          keyName: entry.keyName,
          keyId: entry.keyId,
          language: targetLang,
          result,
        });
      }
    }
  }

  return results;
}
