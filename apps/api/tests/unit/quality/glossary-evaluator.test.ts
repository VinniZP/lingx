/**
 * Glossary Evaluator Unit Tests
 *
 * Tests glossary term validation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  GlossaryEvaluator,
  GLOSSARY_MISSING_TERM_PENALTY,
  GLOSSARY_MAX_PENALTY,
  type GlossaryTerm,
} from '../../../src/services/quality/evaluators/glossary-evaluator.js';

// Create a mock evaluator for testing (no prisma needed for evaluateWithTerms)
const evaluator = new GlossaryEvaluator(null as never);

// ============================================
// evaluateWithTerms
// ============================================

describe('GlossaryEvaluator.evaluateWithTerms', () => {
  describe('no glossary terms', () => {
    it('should return null when glossary is empty', () => {
      const result = evaluator.evaluateWithTerms([], 'Hello world', 'Hallo Welt');
      expect(result).toBeNull();
    });
  });

  describe('no relevant terms', () => {
    it('should return null when no source terms appear in source text', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'document', translations: [{ targetTerm: 'Dokument' }] },
        { sourceTerm: 'save', translations: [{ targetTerm: 'speichern' }] },
      ];
      const result = evaluator.evaluateWithTerms(terms, 'Hello world', 'Hallo Welt');
      expect(result).toBeNull();
    });
  });

  describe('all terms correctly translated', () => {
    it('should return passed=true when all terms are translated', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'save', translations: [{ targetTerm: 'speichern' }] },
        { sourceTerm: 'document', translations: [{ targetTerm: 'Dokument' }] },
      ];
      const result = evaluator.evaluateWithTerms(
        terms,
        'Save the document',
        'Das Dokument speichern'
      );

      expect(result).not.toBeNull();
      expect(result!.passed).toBe(true);
      expect(result!.score).toBe(100);
      expect(result!.issue).toBeUndefined();
    });

    it('should match case-insensitively', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'Save', translations: [{ targetTerm: 'Speichern' }] },
      ];
      const result = evaluator.evaluateWithTerms(terms, 'save the file', 'speichern Sie die Datei');

      expect(result!.passed).toBe(true);
      expect(result!.score).toBe(100);
    });

    it('should match partial words', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'document', translations: [{ targetTerm: 'Dokument' }] },
      ];
      // 'documents' contains 'document', 'Dokumenten' contains 'Dokument'
      const result = evaluator.evaluateWithTerms(terms, 'Save documents', 'Dokumenten speichern');

      expect(result!.passed).toBe(true);
    });
  });

  describe('missing terms', () => {
    it('should return passed=false when one term is missing', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'save', translations: [{ targetTerm: 'speichern' }] },
      ];
      const result = evaluator.evaluateWithTerms(
        terms,
        'Save the file',
        'Die Datei sichern' // Wrong translation: should be 'speichern' not 'sichern'
      );

      expect(result!.passed).toBe(false);
      expect(result!.score).toBe(100 - GLOSSARY_MISSING_TERM_PENALTY);
      expect(result!.issue).toBeDefined();
      expect(result!.issue!.type).toBe('glossary_missing');
      expect(result!.issue!.severity).toBe('warning');
      expect(result!.issue!.message).toContain('speichern');
    });

    it('should reduce score for multiple missing terms', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'save', translations: [{ targetTerm: 'speichern' }] },
        { sourceTerm: 'document', translations: [{ targetTerm: 'Dokument' }] },
      ];
      const result = evaluator.evaluateWithTerms(
        terms,
        'Save the document',
        'Die Datei sichern' // Both terms wrong
      );

      expect(result!.passed).toBe(false);
      expect(result!.score).toBe(100 - 2 * GLOSSARY_MISSING_TERM_PENALTY);
      expect(result!.issue!.message).toContain('speichern');
      expect(result!.issue!.message).toContain('Dokument');
    });

    it('should not go below 0 score', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'a', translations: [{ targetTerm: 'x' }] },
        { sourceTerm: 'b', translations: [{ targetTerm: 'y' }] },
        { sourceTerm: 'c', translations: [{ targetTerm: 'z' }] },
        { sourceTerm: 'd', translations: [{ targetTerm: 'w' }] },
        { sourceTerm: 'e', translations: [{ targetTerm: 'v' }] },
        { sourceTerm: 'f', translations: [{ targetTerm: 'u' }] },
        { sourceTerm: 'g', translations: [{ targetTerm: 't' }] },
        { sourceTerm: 'h', translations: [{ targetTerm: 's' }] },
      ];
      // 8 missing terms × 15 = 120, but score should not go below 0
      const result = evaluator.evaluateWithTerms(terms, 'a b c d e f g h', 'none of them');

      expect(result!.score).toBe(0);
    });

    it('should list all missing terms in issue message', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'save', translations: [{ targetTerm: 'speichern' }] },
        { sourceTerm: 'document', translations: [{ targetTerm: 'Dokument' }] },
        { sourceTerm: 'file', translations: [{ targetTerm: 'Datei' }] },
      ];
      const result = evaluator.evaluateWithTerms(
        terms,
        'Save the document file',
        'Wrong translation here'
      );

      expect(result!.issue!.message).toContain('speichern');
      expect(result!.issue!.message).toContain('Dokument');
      expect(result!.issue!.message).toContain('Datei');
    });
  });

  describe('terms without translations', () => {
    it('should skip terms without target translations', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'save', translations: [] }, // No translation for target language
        { sourceTerm: 'document', translations: [{ targetTerm: 'Dokument' }] },
      ];
      const result = evaluator.evaluateWithTerms(
        terms,
        'Save the document',
        'Das Dokument speichern'
      );

      // 'save' is skipped (no translation), 'document' is found
      expect(result!.passed).toBe(true);
      expect(result!.score).toBe(100);
    });

    it('should treat terms without translations as passed', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'special_term', translations: [] },
      ];
      // Term appears in source but has no translation to check against
      const result = evaluator.evaluateWithTerms(terms, 'Use special_term here', 'Translation');

      // Term without translation is relevant (source appears) but not missing (nothing to check)
      // So it counts as passed
      expect(result).not.toBeNull();
      expect(result!.passed).toBe(true);
      expect(result!.score).toBe(100);
    });
  });

  describe('mixed results', () => {
    it('should only count missing terms, not irrelevant ones', () => {
      const terms: GlossaryTerm[] = [
        { sourceTerm: 'save', translations: [{ targetTerm: 'speichern' }] },
        { sourceTerm: 'document', translations: [{ targetTerm: 'Dokument' }] },
        { sourceTerm: 'delete', translations: [{ targetTerm: 'löschen' }] }, // Not in source
      ];
      const result = evaluator.evaluateWithTerms(
        terms,
        'Save the document', // 'delete' not present
        'Die Datei speichern' // 'Dokument' missing, 'speichern' present
      );

      // Only 'document' is missing (relevant and not translated)
      expect(result!.passed).toBe(false);
      expect(result!.score).toBe(100 - GLOSSARY_MISSING_TERM_PENALTY);
      expect(result!.issue!.message).toContain('Dokument');
      expect(result!.issue!.message).not.toContain('löschen');
    });
  });
});

// ============================================
// calculatePenalty
// ============================================

describe('GlossaryEvaluator.calculatePenalty', () => {
  it('should return 0 for null result', () => {
    expect(GlossaryEvaluator.calculatePenalty(null)).toBe(0);
  });

  it('should return 0 for passed result', () => {
    expect(GlossaryEvaluator.calculatePenalty({ passed: true, score: 100 })).toBe(0);
  });

  it('should return penalty capped at GLOSSARY_MAX_PENALTY', () => {
    // Score of 50 means 50 points lost, but cap is GLOSSARY_MAX_PENALTY (10)
    expect(GlossaryEvaluator.calculatePenalty({ passed: false, score: 50 })).toBe(GLOSSARY_MAX_PENALTY);
  });

  it('should return actual penalty when below max', () => {
    // Score of 95 means 5 points lost, which is below cap
    expect(GlossaryEvaluator.calculatePenalty({ passed: false, score: 95 })).toBe(5);
  });

  it('should handle score of 0', () => {
    expect(GlossaryEvaluator.calculatePenalty({ passed: false, score: 0 })).toBe(GLOSSARY_MAX_PENALTY);
  });
});

// ============================================
// Constants
// ============================================

describe('glossary constants', () => {
  it('should have reasonable penalty per missing term', () => {
    expect(GLOSSARY_MISSING_TERM_PENALTY).toBeGreaterThan(0);
    expect(GLOSSARY_MISSING_TERM_PENALTY).toBeLessThanOrEqual(25); // Not too harsh
  });

  it('should have reasonable max penalty', () => {
    expect(GLOSSARY_MAX_PENALTY).toBeGreaterThan(0);
    expect(GLOSSARY_MAX_PENALTY).toBeLessThanOrEqual(20); // Not too harsh
  });
});
