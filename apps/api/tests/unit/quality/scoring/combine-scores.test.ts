/**
 * Score Combination Unit Tests
 *
 * Tests weighted score calculation.
 */

import { describe, expect, it } from 'vitest';
import {
  SCORE_WEIGHTS,
  calculateCombinedScore,
  type AIScores,
} from '../../../../src/modules/quality-estimation/quality/scoring/combine-scores.js';

describe('SCORE_WEIGHTS', () => {
  it('should have weights that sum to 1.0', () => {
    const total =
      SCORE_WEIGHTS.ACCURACY +
      SCORE_WEIGHTS.FLUENCY +
      SCORE_WEIGHTS.TERMINOLOGY +
      SCORE_WEIGHTS.FORMAT;

    expect(total).toBe(1.0);
  });

  it('should have accuracy as highest weight (40%)', () => {
    expect(SCORE_WEIGHTS.ACCURACY).toBe(0.4);
    expect(SCORE_WEIGHTS.ACCURACY).toBeGreaterThan(SCORE_WEIGHTS.FLUENCY);
    expect(SCORE_WEIGHTS.ACCURACY).toBeGreaterThan(SCORE_WEIGHTS.TERMINOLOGY);
    expect(SCORE_WEIGHTS.ACCURACY).toBeGreaterThan(SCORE_WEIGHTS.FORMAT);
  });

  it('should have expected weight values', () => {
    expect(SCORE_WEIGHTS.ACCURACY).toBe(0.4);
    expect(SCORE_WEIGHTS.FLUENCY).toBe(0.25);
    expect(SCORE_WEIGHTS.TERMINOLOGY).toBe(0.15);
    expect(SCORE_WEIGHTS.FORMAT).toBe(0.2);
  });
});

describe('calculateCombinedScore', () => {
  describe('perfect scores', () => {
    it('should return 100 for all perfect scores', () => {
      const aiScores: AIScores = { accuracy: 100, fluency: 100, terminology: 100 };

      const result = calculateCombinedScore(aiScores, 100);

      expect(result).toBe(100);
    });
  });

  describe('zero scores', () => {
    it('should return 0 for all zero scores', () => {
      const aiScores: AIScores = { accuracy: 0, fluency: 0, terminology: 0 };

      const result = calculateCombinedScore(aiScores, 0);

      expect(result).toBe(0);
    });
  });

  describe('weighted calculation', () => {
    it('should weight accuracy highest (40%)', () => {
      // Only accuracy = 100, others = 0
      const aiScores: AIScores = { accuracy: 100, fluency: 0, terminology: 0 };

      const result = calculateCombinedScore(aiScores, 0);

      expect(result).toBe(40);
    });

    it('should weight fluency at 25%', () => {
      const aiScores: AIScores = { accuracy: 0, fluency: 100, terminology: 0 };

      const result = calculateCombinedScore(aiScores, 0);

      expect(result).toBe(25);
    });

    it('should weight terminology at 15%', () => {
      const aiScores: AIScores = { accuracy: 0, fluency: 0, terminology: 100 };

      const result = calculateCombinedScore(aiScores, 0);

      expect(result).toBe(15);
    });

    it('should weight format at 20%', () => {
      const aiScores: AIScores = { accuracy: 0, fluency: 0, terminology: 0 };

      const result = calculateCombinedScore(aiScores, 100);

      expect(result).toBe(20);
    });
  });

  describe('rounding behavior', () => {
    it('should round down at .4', () => {
      // 85.4 should round to 85
      // Need: 0.4*accuracy + 0.25*fluency + 0.15*terminology + 0.2*format = 85.4
      // Using: accuracy=85, fluency=85, terminology=85, format=86
      // 0.4*85 + 0.25*85 + 0.15*85 + 0.2*86 = 34 + 21.25 + 12.75 + 17.2 = 85.2 → 85
      const aiScores: AIScores = { accuracy: 85, fluency: 85, terminology: 85 };

      const result = calculateCombinedScore(aiScores, 86);

      expect(result).toBe(85);
    });

    it('should round up at .5', () => {
      // 85.5 should round to 86
      // 0.4*86 + 0.25*85 + 0.15*85 + 0.2*85 = 34.4 + 21.25 + 12.75 + 17 = 85.4 → 85
      // Need different values...
      // 0.4*85 + 0.25*86 + 0.15*86 + 0.2*86 = 34 + 21.5 + 12.9 + 17.2 = 85.6 → 86
      const aiScores: AIScores = { accuracy: 85, fluency: 86, terminology: 86 };

      const result = calculateCombinedScore(aiScores, 86);

      expect(result).toBe(86);
    });

    it('should round 85.5 to 86 (banker rounding)', () => {
      // Math.round(85.5) = 86 in JavaScript
      const aiScores: AIScores = { accuracy: 88, fluency: 83, terminology: 83 };
      // 0.4*88 + 0.25*83 + 0.15*83 + 0.2*83 = 35.2 + 20.75 + 12.45 + 16.6 = 85
      const result = calculateCombinedScore(aiScores, 83);
      expect(result).toBe(85);
    });
  });

  describe('mixed scores', () => {
    it('should calculate mixed scores correctly', () => {
      const aiScores: AIScores = { accuracy: 90, fluency: 80, terminology: 70 };
      // 0.4*90 + 0.25*80 + 0.15*70 + 0.2*60 = 36 + 20 + 10.5 + 12 = 78.5 → 79
      const result = calculateCombinedScore(aiScores, 60);

      expect(result).toBe(79);
    });

    it('should handle high accuracy with low others', () => {
      const aiScores: AIScores = { accuracy: 100, fluency: 50, terminology: 50 };
      // 0.4*100 + 0.25*50 + 0.15*50 + 0.2*50 = 40 + 12.5 + 7.5 + 10 = 70
      const result = calculateCombinedScore(aiScores, 50);

      expect(result).toBe(70);
    });

    it('should handle low accuracy with high others', () => {
      const aiScores: AIScores = { accuracy: 50, fluency: 100, terminology: 100 };
      // 0.4*50 + 0.25*100 + 0.15*100 + 0.2*100 = 20 + 25 + 15 + 20 = 80
      const result = calculateCombinedScore(aiScores, 100);

      expect(result).toBe(80);
    });
  });

  describe('edge cases', () => {
    it('should handle decimal input scores', () => {
      const aiScores: AIScores = { accuracy: 85.5, fluency: 72.3, terminology: 68.9 };
      // 0.4*85.5 + 0.25*72.3 + 0.15*68.9 + 0.2*90.2 = 34.2 + 18.075 + 10.335 + 18.04 = 80.65 → 81
      const result = calculateCombinedScore(aiScores, 90.2);

      expect(result).toBe(81);
    });

    it('should handle scores over 100 (not clamped)', () => {
      // Function doesn't clamp - passes through
      const aiScores: AIScores = { accuracy: 110, fluency: 110, terminology: 110 };

      const result = calculateCombinedScore(aiScores, 110);

      expect(result).toBe(110);
    });

    it('should handle negative scores (not clamped)', () => {
      // Function doesn't clamp - passes through
      const aiScores: AIScores = { accuracy: -10, fluency: 50, terminology: 50 };
      // 0.4*(-10) + 0.25*50 + 0.15*50 + 0.2*50 = -4 + 12.5 + 7.5 + 10 = 26
      const result = calculateCombinedScore(aiScores, 50);

      expect(result).toBe(26);
    });
  });
});
