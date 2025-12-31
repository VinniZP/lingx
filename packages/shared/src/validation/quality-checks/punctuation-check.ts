/**
 * Punctuation Mismatch Checker
 *
 * Checks that ending punctuation matches between source and target translations.
 */

import type { QualityChecker, QualityCheckInput, QualityIssue } from './types.js';

/**
 * End punctuation characters to check
 * Includes common Western and CJK punctuation
 */
const END_PUNCTUATION = /[.!?;:。！？；：…]$/;

/**
 * Extracts the ending punctuation from a string
 */
function getEndPunctuation(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(END_PUNCTUATION);
  return match ? match[0] : null;
}

/**
 * Checks that ending punctuation matches between source and target
 */
export const punctuationChecker: QualityChecker = {
  name: 'punctuation',

  check(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];

    const sourcePunct = getEndPunctuation(input.source);
    const targetPunct = getEndPunctuation(input.target);

    // If source has ending punctuation but target doesn't or differs
    if (sourcePunct && sourcePunct !== targetPunct) {
      const targetTrimmed = input.target.trim();
      issues.push({
        type: 'punctuation_mismatch',
        severity: 'warning',
        message: targetPunct
          ? `Ending punctuation mismatch: expected "${sourcePunct}", found "${targetPunct}"`
          : `Missing ending punctuation: expected "${sourcePunct}"`,
        position: targetPunct
          ? { start: targetTrimmed.length - 1, end: targetTrimmed.length }
          : undefined,
        context: {
          expected: sourcePunct,
          found: targetPunct || undefined,
        },
      });
    }

    // If target has ending punctuation but source doesn't
    if (targetPunct && !sourcePunct) {
      const targetTrimmed = input.target.trim();
      issues.push({
        type: 'punctuation_mismatch',
        severity: 'info',
        message: `Translation has ending punctuation "${targetPunct}" but source does not`,
        position: {
          start: targetTrimmed.length - 1,
          end: targetTrimmed.length,
        },
        context: {
          found: targetPunct,
        },
      });
    }

    return issues;
  },
};
