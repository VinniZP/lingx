/**
 * AI Issue Mapping Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  mapAIIssuesToQualityIssues,
  type AIIssue,
} from '../../../../src/services/quality/scoring/map-ai-issues.js';

describe('mapAIIssuesToQualityIssues', () => {
  describe('empty input', () => {
    it('should return empty array for empty input', () => {
      const result = mapAIIssuesToQualityIssues([]);

      expect(result).toEqual([]);
    });
  });

  describe('severity mapping', () => {
    it('should map critical to error', () => {
      const aiIssues: AIIssue[] = [
        { type: 'accuracy', severity: 'critical', message: 'Critical error' },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].severity).toBe('error');
    });

    it('should map major to warning', () => {
      const aiIssues: AIIssue[] = [
        { type: 'fluency', severity: 'major', message: 'Major issue' },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].severity).toBe('warning');
    });

    it('should map minor to info', () => {
      const aiIssues: AIIssue[] = [
        { type: 'style', severity: 'minor', message: 'Minor suggestion' },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].severity).toBe('info');
    });
  });

  describe('type prefixing', () => {
    it('should prefix type with ai_', () => {
      const aiIssues: AIIssue[] = [
        { type: 'accuracy', severity: 'major', message: 'Test' },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].type).toBe('ai_accuracy');
    });

    it('should preserve original type after prefix', () => {
      const types = ['accuracy', 'fluency', 'terminology', 'style', 'grammar'];

      for (const type of types) {
        const aiIssues: AIIssue[] = [{ type, severity: 'minor', message: 'Test' }];
        const result = mapAIIssuesToQualityIssues(aiIssues);
        expect(result[0].type).toBe(`ai_${type}`);
      }
    });
  });

  describe('message preservation', () => {
    it('should preserve message as-is', () => {
      const message = 'The translation loses nuance from the original';
      const aiIssues: AIIssue[] = [
        { type: 'accuracy', severity: 'major', message },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].message).toBe(message);
    });

    it('should preserve empty message', () => {
      const aiIssues: AIIssue[] = [
        { type: 'style', severity: 'minor', message: '' },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].message).toBe('');
    });

    it('should preserve special characters in message', () => {
      const message = 'Missing placeholder {name} → should be {nombre}';
      const aiIssues: AIIssue[] = [
        { type: 'accuracy', severity: 'critical', message },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].message).toBe(message);
    });
  });

  describe('multiple issues', () => {
    it('should map all issues', () => {
      const aiIssues: AIIssue[] = [
        { type: 'accuracy', severity: 'critical', message: 'Missing meaning' },
        { type: 'fluency', severity: 'major', message: 'Awkward phrasing' },
        { type: 'terminology', severity: 'minor', message: 'Consider using domain term' },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        type: 'ai_accuracy',
        severity: 'error',
        message: 'Missing meaning',
      });
      expect(result[1]).toEqual({
        type: 'ai_fluency',
        severity: 'warning',
        message: 'Awkward phrasing',
      });
      expect(result[2]).toEqual({
        type: 'ai_terminology',
        severity: 'info',
        message: 'Consider using domain term',
      });
    });

    it('should preserve order of issues', () => {
      const aiIssues: AIIssue[] = [
        { type: 'first', severity: 'minor', message: '1' },
        { type: 'second', severity: 'minor', message: '2' },
        { type: 'third', severity: 'minor', message: '3' },
      ];

      const result = mapAIIssuesToQualityIssues(aiIssues);

      expect(result[0].type).toBe('ai_first');
      expect(result[1].type).toBe('ai_second');
      expect(result[2].type).toBe('ai_third');
    });
  });
});
