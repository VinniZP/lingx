/**
 * Quality API Contracts
 *
 * Shared types for quality estimation between frontend and backend.
 * Per refactoring plan: eliminate type duplication.
 */

import type { QualityIssue } from '../validation/quality-checks/types.js';
import type { QualityScoreResult } from '../validation/quality-checks/score-calculator.js';

// Re-export base types for convenience
export type { QualityIssue, QualityScoreResult };

/**
 * Score thresholds for quality rating categories
 */
export const QUALITY_THRESHOLDS = {
  /** Excellent quality: 80-100 */
  EXCELLENT: 80,
  /** Good quality: 60-79 */
  GOOD: 60,
  /** Needs review: 0-59 */
  NEEDS_REVIEW: 0,
} as const;

/**
 * Score weights for combining AI dimension scores
 */
export const SCORE_WEIGHTS = {
  /** Accuracy (meaning preservation): 40% */
  ACCURACY: 0.4,
  /** Fluency (grammar/naturalness): 25% */
  FLUENCY: 0.25,
  /** Terminology (glossary compliance): 15% */
  TERMINOLOGY: 0.15,
  /** Format (placeholders, whitespace): 20% */
  FORMAT: 0.2,
} as const;

/**
 * Evaluation type indicating how the score was determined
 */
export type EvaluationType = 'heuristic' | 'ai' | 'hybrid';

/**
 * Extended quality score with AI evaluation dimensions
 *
 * Extends the base QualityScoreResult with AI-specific metrics
 * and caching information.
 */
export interface QualityScore extends QualityScoreResult {
  /** AI accuracy score (0-100) - meaning preservation */
  accuracy?: number;
  /** AI fluency score (0-100) - grammar and naturalness */
  fluency?: number;
  /** AI terminology score (0-100) - glossary and domain terms */
  terminology?: number;
  /** Format score (0-100) - placeholders, whitespace, punctuation */
  format?: number;
  /** How the score was determined */
  evaluationType: EvaluationType;
  /** Whether this score was served from cache */
  cached: boolean;
}

/**
 * Branch-level quality statistics summary
 */
export interface BranchQualitySummary {
  /** Average score across all evaluated translations */
  averageScore: number;
  /** Distribution of translations by quality category */
  distribution: {
    /** Translations scoring 80-100 */
    excellent: number;
    /** Translations scoring 60-79 */
    good: number;
    /** Translations scoring 0-59 */
    needsReview: number;
  };
  /** Per-language quality statistics */
  byLanguage: Record<string, { average: number; count: number }>;
  /** Number of translations with scores */
  totalScored: number;
  /** Total number of translations in branch */
  totalTranslations: number;
}

/**
 * Project-level quality scoring configuration
 */
export interface QualityScoringConfig {
  /** Automatically score translations after AI translation */
  scoreAfterAITranslation: boolean;
  /** Score translations before allowing merge */
  scoreBeforeMerge: boolean;
  /** Minimum score to auto-approve (0-100) */
  autoApproveThreshold: number;
  /** Score below which to flag for review (0-100) */
  flagThreshold: number;
  /** Enable AI-based quality evaluation */
  aiEvaluationEnabled: boolean;
  /** AI provider to use for evaluation */
  aiEvaluationProvider: string | null;
  /** AI model to use for evaluation */
  aiEvaluationModel: string | null;
}

/**
 * Result of batch quality evaluation job request
 *
 * Note: Named differently from BatchQualityResult in runner.ts
 * which is for the batch check runner results.
 */
export interface BatchQualityJobResult {
  /** Job ID for tracking progress */
  jobId: string;
  /** Statistics about the batch */
  stats: {
    /** Total translations in batch */
    total: number;
    /** Translations served from cache */
    cached: number;
    /** Translations queued for evaluation */
    queued: number;
  };
}

/**
 * ICU syntax validation result
 */
export interface ICUValidationResult {
  /** Whether the ICU syntax is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Parsed argument names if valid */
  argumentNames?: string[];
}

/**
 * Options for quality evaluation
 */
export interface EvaluateOptions {
  /** Force AI evaluation even if heuristics pass */
  forceAI?: boolean;
}

/**
 * Helper to categorize score into quality rating
 */
export function getQualityRating(score: number): 'excellent' | 'good' | 'needsReview' {
  if (score >= QUALITY_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= QUALITY_THRESHOLDS.GOOD) return 'good';
  return 'needsReview';
}
