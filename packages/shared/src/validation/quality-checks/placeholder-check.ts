/**
 * Placeholder Consistency Checker
 *
 * Verifies that {variable} placeholders in source text appear in target translations.
 */

import type { QualityChecker, QualityCheckInput, QualityIssue } from './types.js';

/**
 * Regex to match {variable} style placeholders
 * Matches simple variables like {name} and ICU patterns like {count, plural, ...}
 */
const PLACEHOLDER_REGEX = /\{([^{},\s]+)(?:[,}])/g;

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts all placeholder variable names from a string
 *
 * @example
 * extractPlaceholders("Hello {name}!") // ["name"]
 * extractPlaceholders("{count, plural, one {# item} other {# items}}") // ["count"]
 */
export function extractPlaceholders(text: string): string[] {
  const placeholders: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  PLACEHOLDER_REGEX.lastIndex = 0;

  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    const varName = match[1];
    if (!placeholders.includes(varName)) {
      placeholders.push(varName);
    }
  }

  return placeholders;
}

/**
 * Checks that placeholders in source text appear in target translation
 */
export const placeholderChecker: QualityChecker = {
  name: 'placeholder',

  check(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];

    const sourcePlaceholders = extractPlaceholders(input.source);
    const targetPlaceholders = extractPlaceholders(input.target);

    const sourceSet = new Set(sourcePlaceholders);
    const targetSet = new Set(targetPlaceholders);

    // Check for missing placeholders (in source but not in target)
    for (const placeholder of sourcePlaceholders) {
      if (!targetSet.has(placeholder)) {
        issues.push({
          type: 'placeholder_missing',
          severity: 'error',
          message: `Missing placeholder: {${placeholder}}`,
          context: {
            placeholder,
            expected: `{${placeholder}}`,
          },
        });
      }
    }

    // Check for extra placeholders (in target but not in source)
    for (const placeholder of targetPlaceholders) {
      if (!sourceSet.has(placeholder)) {
        // Find position in target
        const regex = new RegExp(`\\{${escapeRegex(placeholder)}[,}]`);
        const match = regex.exec(input.target);

        issues.push({
          type: 'placeholder_extra',
          severity: 'warning',
          message: `Unexpected placeholder: {${placeholder}}`,
          position: match
            ? { start: match.index, end: match.index + placeholder.length + 2 }
            : undefined,
          context: {
            placeholder,
            found: `{${placeholder}}`,
          },
        });
      }
    }

    return issues;
  },
};
