import { describe, it, expect } from 'vitest';
import {
  validateIcuMessage,
  validateTranslations,
  summarizeValidation,
  type IcuValidationResult,
} from '../../src/lib/validator/icu-validator.js';

describe('ICU Validator', () => {
  describe('validateIcuMessage', () => {
    it('should validate correct plural syntax', () => {
      const result = validateIcuMessage(
        '{count, plural, =0 {No items} one {1 item} other {{count} items}}'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct select syntax', () => {
      const result = validateIcuMessage(
        '{gender, select, male {He} female {She} other {They}}'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing closing brace', () => {
      const result = validateIcuMessage('{name');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept custom plural selectors per ICU spec', () => {
      // The ICU parser allows custom keywords in plural - they are treated as exact matches
      const result = validateIcuMessage(
        '{count, plural, =0 {None} custom {Custom} other {Items}}'
      );
      expect(result.isValid).toBe(true);
    });

    it('should detect missing plural other clause', () => {
      // Missing 'other' clause is an actual error
      const result = validateIcuMessage(
        '{count, plural, one {One}}'
      );
      expect(result.isValid).toBe(false);
    });

    it('should validate nested ICU patterns', () => {
      const result = validateIcuMessage(
        '{count, plural, =0 {No notifications} other {You have {count} {count, plural, one {notification} other {notifications}}}}'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate date/time formatting', () => {
      const result = validateIcuMessage('Updated {date, date, medium}');
      expect(result.isValid).toBe(true);
      expect(result.variables).toContain('date');
      expect(result.patterns).toContain('date');
    });

    it('should validate number formatting', () => {
      const result = validateIcuMessage('Price: {amount, number, currency}');
      expect(result.isValid).toBe(true);
      expect(result.variables).toContain('amount');
      expect(result.patterns).toContain('number');
    });

    it('should return empty variables for plain text', () => {
      const result = validateIcuMessage('Hello, World!');
      expect(result.isValid).toBe(true);
      expect(result.variables).toHaveLength(0);
    });

    it('should treat extra closing braces as literal text per ICU spec', () => {
      // The ICU parser treats extra closing braces as literal text
      const result = validateIcuMessage('Hello {name}}');
      expect(result.isValid).toBe(true);
    });

    it('should detect truly unbalanced braces with missing close', () => {
      // Missing closing brace is an actual error
      const result = validateIcuMessage('Hello {name and more text');
      expect(result.isValid).toBe(false);
    });

    it('should extract variables from simple interpolation', () => {
      const result = validateIcuMessage('Hello, {name}!');
      expect(result.isValid).toBe(true);
      expect(result.variables).toContain('name');
    });

    it('should extract multiple variables', () => {
      const result = validateIcuMessage('{firstName} {lastName} has {count} items');
      expect(result.isValid).toBe(true);
      expect(result.variables).toEqual(expect.arrayContaining(['firstName', 'lastName', 'count']));
      expect(result.variables).toHaveLength(3);
    });

    it('should detect patterns correctly', () => {
      const result = validateIcuMessage(
        '{count, plural, one {item} other {items}} by {gender, select, male {him} female {her} other {them}}'
      );
      expect(result.isValid).toBe(true);
      expect(result.patterns).toContain('plural');
      expect(result.patterns).toContain('select');
    });

    it('should assess complexity as simple for plain text', () => {
      const result = validateIcuMessage('Hello, World!');
      expect(result.complexity).toBe('simple');
    });

    it('should assess complexity as moderate for single variable', () => {
      const result = validateIcuMessage('Hello, {name}!');
      expect(result.complexity).toBe('moderate');
    });

    it('should assess complexity as complex for multiple patterns', () => {
      const result = validateIcuMessage(
        '{count, plural, one {{user}} other {{users}}} - {date, date, short}'
      );
      expect(result.complexity).toBe('complex');
    });

    it('should validate time formatting', () => {
      const result = validateIcuMessage('Meeting at {time, time, short}');
      expect(result.isValid).toBe(true);
      expect(result.variables).toContain('time');
      expect(result.patterns).toContain('time');
    });

    it('should provide error location when available', () => {
      const result = validateIcuMessage('{invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeDefined();
      expect(result.errors[0].message).toBeTruthy();
    });
  });

  describe('validateTranslations', () => {
    it('should validate multiple translations', () => {
      const translations = {
        'greeting': 'Hello, {name}!',
        'count': '{count, plural, one {1 item} other {{count} items}}',
        'plain': 'Just plain text',
      };

      const results = validateTranslations(translations);

      expect(results.size).toBe(3);
      expect(results.get('greeting')?.isValid).toBe(true);
      expect(results.get('count')?.isValid).toBe(true);
      expect(results.get('plain')?.isValid).toBe(true);
    });

    it('should identify invalid translations in batch', () => {
      const translations = {
        'valid': 'Hello!',
        'invalid': '{unclosed',
      };

      const results = validateTranslations(translations);

      expect(results.get('valid')?.isValid).toBe(true);
      expect(results.get('invalid')?.isValid).toBe(false);
    });

    it('should handle empty translations object', () => {
      const results = validateTranslations({});
      expect(results.size).toBe(0);
    });
  });

  describe('summarizeValidation', () => {
    it('should summarize all valid translations', () => {
      const results = new Map<string, IcuValidationResult>([
        ['key1', { isValid: true, errors: [], variables: [], patterns: [], complexity: 'simple' }],
        ['key2', { isValid: true, errors: [], variables: ['name'], patterns: [], complexity: 'moderate' }],
      ]);

      const summary = summarizeValidation(results);

      expect(summary.total).toBe(2);
      expect(summary.valid).toBe(2);
      expect(summary.invalid).toBe(0);
      expect(summary.errors).toHaveLength(0);
    });

    it('should summarize with invalid translations', () => {
      const results = new Map<string, IcuValidationResult>([
        ['valid', { isValid: true, errors: [], variables: [], patterns: [], complexity: 'simple' }],
        ['invalid', {
          isValid: false,
          errors: [{ message: 'Parse error' }],
          variables: [],
          patterns: [],
          complexity: 'simple',
        }],
      ]);

      const summary = summarizeValidation(results);

      expect(summary.total).toBe(2);
      expect(summary.valid).toBe(1);
      expect(summary.invalid).toBe(1);
      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0].key).toBe('invalid');
      expect(summary.errors[0].errors[0].message).toBe('Parse error');
    });

    it('should handle empty results', () => {
      const results = new Map<string, IcuValidationResult>();
      const summary = summarizeValidation(results);

      expect(summary.total).toBe(0);
      expect(summary.valid).toBe(0);
      expect(summary.invalid).toBe(0);
      expect(summary.errors).toHaveLength(0);
    });
  });
});
