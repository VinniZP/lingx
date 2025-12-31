/**
 * Whitespace Issue Checker
 *
 * Detects problematic whitespace in translations:
 * - Leading/trailing whitespace (unless source has it)
 * - Double spaces
 * - Tab characters
 */

import type { QualityChecker, QualityCheckInput, QualityIssue } from './types.js';

/**
 * Checks for whitespace issues in translations
 */
export const whitespaceChecker: QualityChecker = {
  name: 'whitespace',

  check(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const target = input.target;

    // Leading whitespace (unless source also has it)
    if (/^\s+/.test(target) && !/^\s+/.test(input.source)) {
      const match = target.match(/^(\s+)/);
      if (match) {
        issues.push({
          type: 'whitespace_leading',
          severity: 'warning',
          message: 'Translation has unexpected leading whitespace',
          position: { start: 0, end: match[1].length },
        });
      }
    }

    // Trailing whitespace (unless source also has it)
    if (/\s+$/.test(target) && !/\s+$/.test(input.source)) {
      const match = target.match(/(\s+)$/);
      if (match) {
        const start = target.length - match[1].length;
        issues.push({
          type: 'whitespace_trailing',
          severity: 'warning',
          message: 'Translation has unexpected trailing whitespace',
          position: { start, end: target.length },
        });
      }
    }

    // Double spaces (unless source has double spaces)
    if (!/ {2,}/.test(input.source)) {
      const doubleSpaceRegex = / {2,}/g;
      let match: RegExpExecArray | null;
      while ((match = doubleSpaceRegex.exec(target)) !== null) {
        issues.push({
          type: 'whitespace_double',
          severity: 'warning',
          message: 'Translation contains multiple consecutive spaces',
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    // Tab characters
    const tabRegex = /\t/g;
    let tabMatch: RegExpExecArray | null;
    while ((tabMatch = tabRegex.exec(target)) !== null) {
      issues.push({
        type: 'whitespace_tab',
        severity: 'warning',
        message: 'Translation contains tab character',
        position: { start: tabMatch.index, end: tabMatch.index + 1 },
      });
    }

    return issues;
  },
};
