/**
 * Score Combination
 *
 * Weighted score calculation for combining AI dimensions with heuristic format score.
 */

/**
 * Score dimension weights for calculating final combined score.
 * Total equals 1.0.
 */
export const SCORE_WEIGHTS = {
  /** AI accuracy weight (semantic fidelity to source) */
  ACCURACY: 0.4,
  /** AI fluency weight (natural language quality) */
  FLUENCY: 0.25,
  /** AI terminology weight (domain terms correctness) */
  TERMINOLOGY: 0.15,
  /** Heuristic format weight (ICU, placeholders, length) */
  FORMAT: 0.2,
} as const;

export interface AIScores {
  accuracy: number;
  fluency: number;
  terminology: number;
}

/**
 * Calculate combined quality score from AI dimensions and heuristic format score.
 *
 * Uses weighted average:
 * - Accuracy: 40% (semantic fidelity to source)
 * - Fluency: 25% (natural language quality)
 * - Terminology: 15% (domain term correctness)
 * - Format: 20% (ICU, placeholders, length from heuristics)
 *
 * @param aiScores - AI evaluation scores (0-100 each)
 * @param formatScore - Heuristic format score (0-100)
 * @returns Combined score (0-100), rounded to nearest integer
 */
export function calculateCombinedScore(aiScores: AIScores, formatScore: number): number {
  const raw =
    aiScores.accuracy * SCORE_WEIGHTS.ACCURACY +
    aiScores.fluency * SCORE_WEIGHTS.FLUENCY +
    aiScores.terminology * SCORE_WEIGHTS.TERMINOLOGY +
    formatScore * SCORE_WEIGHTS.FORMAT;

  return Math.round(raw);
}
