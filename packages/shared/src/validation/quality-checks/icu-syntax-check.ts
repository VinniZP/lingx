/**
 * ICU MessageFormat Syntax Checker
 *
 * Validates ICU MessageFormat syntax with two levels:
 * 1. Regex-based quick checks (always available)
 * 2. Full parser validation (optional dependency)
 */

import type { QualityChecker, QualityCheckInput, QualityIssue } from './types.js';

/**
 * ICU Syntax checker - validates MessageFormat syntax
 *
 * Uses regex for quick validation checks:
 * - Unbalanced braces
 * - Empty placeholders
 * - Invalid nesting
 *
 * For full validation, use validateICUSyntaxAsync() with @messageformat/parser
 */
export const icuSyntaxChecker: QualityChecker = {
  name: 'icu_syntax',

  check(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];

    if (!input.target?.trim()) return issues;

    // Check 1: Unbalanced braces
    const openBraces = (input.target.match(/\{/g) || []).length;
    const closeBraces = (input.target.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push({
        type: 'icu_syntax',
        severity: 'error',
        message: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
      });
    }

    // Check 2: Empty placeholders {}
    if (/\{\s*\}/.test(input.target)) {
      issues.push({
        type: 'icu_syntax',
        severity: 'error',
        message: 'Empty placeholder {} found',
      });
    }

    // Check 3: Unclosed select/plural blocks
    // Match pattern: {count, plural, ...} should have closing brace
    const pluralPattern = /\{[^}]+,\s*(plural|select|selectordinal)/g;
    const matches = input.target.match(pluralPattern);

    if (matches) {
      // For each match, ensure proper closing
      // This is a simplified check - full parsing is more reliable
      for (const match of matches) {
        // Count braces after the keyword to ensure they balance
        const remaining = input.target.substring(input.target.indexOf(match) + match.length);
        let depth = 1; // We're already inside one brace
        let closed = false;

        for (const char of remaining) {
          if (char === '{') depth++;
          if (char === '}') {
            depth--;
            if (depth === 0) {
              closed = true;
              break;
            }
          }
        }

        if (!closed && depth > 0) {
          issues.push({
            type: 'icu_syntax',
            severity: 'error',
            message: `Unclosed ${match.includes('plural') ? 'plural' : 'select'} block`,
          });
        }
      }
    }

    return issues;
  },
};

/**
 * Full ICU syntax validation using @messageformat/parser
 *
 * @param text - Text to validate
 * @returns Validation result with optional error message
 *
 * @example
 * const result = await validateICUSyntaxAsync("Hello {name}!");
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
export async function validateICUSyntaxAsync(
  text: string
): Promise<{ valid: boolean; error?: string }> {
  if (!text || !text.trim()) {
    return { valid: true };
  }

  try {
    const { parse } = await import('@messageformat/parser');
    parse(text);
    return { valid: true };
  } catch (error) {
    // Syntax error from parser
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid ICU MessageFormat syntax',
    };
  }
}
