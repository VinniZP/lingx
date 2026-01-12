/**
 * Format-Only Result Unit Tests
 */

import { describe, expect, it } from 'vitest';
import {
  ICU_INVALID_SCORE,
  ICU_VALID_SCORE,
  buildFormatOnlyResult,
  type ICUCheckResult,
} from '../../../quality/scoring/format-only-result.js';

describe('constants', () => {
  it('should have ICU_VALID_SCORE as 100', () => {
    expect(ICU_VALID_SCORE).toBe(100);
  });

  it('should have ICU_INVALID_SCORE as 50', () => {
    expect(ICU_INVALID_SCORE).toBe(50);
  });
});

describe('buildFormatOnlyResult', () => {
  describe('valid ICU syntax', () => {
    it('should return perfect score for valid ICU', () => {
      const icuCheck: ICUCheckResult = { valid: true };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.score).toBe(100);
    });

    it('should return no issues for valid ICU', () => {
      const icuCheck: ICUCheckResult = { valid: true };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.issues).toEqual([]);
    });

    it('should ignore error field when valid', () => {
      const icuCheck: ICUCheckResult = {
        valid: true,
        error: 'This should be ignored',
      };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.score).toBe(100);
      expect(result.issues).toEqual([]);
    });
  });

  describe('invalid ICU syntax', () => {
    it('should return reduced score for invalid ICU', () => {
      const icuCheck: ICUCheckResult = {
        valid: false,
        error: 'Unclosed brace',
      };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.score).toBe(50);
    });

    it('should return one error issue for invalid ICU', () => {
      const icuCheck: ICUCheckResult = {
        valid: false,
        error: 'Missing closing brace',
      };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.issues).toHaveLength(1);
    });

    it('should set issue type as icu_syntax', () => {
      const icuCheck: ICUCheckResult = {
        valid: false,
        error: 'Parse error',
      };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.issues[0].type).toBe('icu_syntax');
    });

    it('should set issue severity as error', () => {
      const icuCheck: ICUCheckResult = {
        valid: false,
        error: 'Parse error',
      };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.issues[0].severity).toBe('error');
    });

    it('should propagate error message', () => {
      const errorMessage = "Expected ',' or '}' after select category";
      const icuCheck: ICUCheckResult = {
        valid: false,
        error: errorMessage,
      };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.issues[0].message).toBe(errorMessage);
    });

    it('should use default message when error is undefined', () => {
      const icuCheck: ICUCheckResult = {
        valid: false,
      };

      const result = buildFormatOnlyResult(icuCheck);

      expect(result.issues[0].message).toBe('Invalid ICU syntax');
    });

    it('should use default message when error is empty string', () => {
      const icuCheck: ICUCheckResult = {
        valid: false,
        error: '',
      };

      const result = buildFormatOnlyResult(icuCheck);

      // Empty string is falsy, so default is used
      expect(result.issues[0].message).toBe('Invalid ICU syntax');
    });
  });
});
