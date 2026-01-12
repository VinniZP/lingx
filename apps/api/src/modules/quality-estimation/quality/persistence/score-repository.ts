/**
 * Score Repository
 *
 * Handles persistence of translation quality scores.
 * Provides CRUD operations and aggregation queries.
 */

import type { BranchQualitySummary, QualityIssue, QualityScore } from '@lingx/shared';
import type { PrismaClient, TranslationQualityScore as PrismaQualityScore } from '@prisma/client';

// ============================================
// Types
// ============================================

/**
 * Data required to save a quality score
 */
export interface SaveScoreData {
  /** Overall quality score (0-100) */
  score: number;
  /** AI accuracy score (0-100) */
  accuracy?: number;
  /** AI fluency score (0-100) */
  fluency?: number;
  /** AI terminology score (0-100) */
  terminology?: number;
  /** Heuristic format score (0-100) */
  format?: number;
  /** Quality issues found */
  issues: QualityIssue[];
  /** How the score was calculated */
  evaluationType: 'heuristic' | 'ai' | 'hybrid';
  /** AI provider used (if AI evaluation) */
  provider?: string;
  /** AI model used (if AI evaluation) */
  model?: string;
  /** Input tokens used (if AI evaluation) */
  inputTokens?: number;
  /** Output tokens used (if AI evaluation) */
  outputTokens?: number;
  /** Content hash for cache validation */
  contentHash?: string;
  /** True if AI evaluation failed and fell back to heuristics */
  aiFallback?: boolean;
}

/**
 * Result of finding a quality score
 */
export interface FindScoreResult {
  /** The quality score record */
  score: QualityScore;
  /** The stored content hash */
  contentHash: string | null;
}

// ============================================
// Score Repository
// ============================================

/**
 * Repository for translation quality scores.
 *
 * Handles persistence operations:
 * - Save/update scores
 * - Find by translation ID
 * - Get branch summaries
 *
 * @example
 * const repo = new ScoreRepository(prisma);
 * await repo.save('translation-id', {
 *   score: 85,
 *   issues: [],
 *   evaluationType: 'heuristic',
 * });
 */
export class ScoreRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Save or update a quality score.
   *
   * Uses upsert to handle both create and update cases.
   *
   * @param translationId - Translation to score
   * @param data - Score data to save
   * @returns The saved quality score
   */
  async save(translationId: string, data: SaveScoreData): Promise<QualityScore> {
    await this.prisma.translationQualityScore.upsert({
      where: { translationId },
      update: {
        score: data.score,
        accuracyScore: data.accuracy ?? null,
        fluencyScore: data.fluency ?? null,
        terminologyScore: data.terminology ?? null,
        formatScore: data.format || data.score,
        evaluationType: data.evaluationType,
        provider: data.provider ?? null,
        model: data.model ?? null,
        issues: data.issues as unknown as object,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        contentHash: data.contentHash ?? null,
      },
      create: {
        translationId,
        score: data.score,
        accuracyScore: data.accuracy ?? null,
        fluencyScore: data.fluency ?? null,
        terminologyScore: data.terminology ?? null,
        formatScore: data.format || data.score,
        evaluationType: data.evaluationType,
        provider: data.provider ?? null,
        model: data.model ?? null,
        issues: data.issues as unknown as object,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        contentHash: data.contentHash ?? null,
      },
    });

    return {
      score: data.score,
      accuracy: data.accuracy,
      fluency: data.fluency,
      terminology: data.terminology,
      format: data.format,
      passed: data.score >= 80,
      needsAIEvaluation: false, // Already evaluated
      issues: data.issues,
      evaluationType: data.evaluationType,
      cached: false,
      aiFallback: data.aiFallback,
    };
  }

  /**
   * Find a quality score by translation ID.
   *
   * @param translationId - Translation to find score for
   * @returns Score with content hash, or null if not found
   */
  async findByTranslationId(translationId: string): Promise<FindScoreResult | null> {
    const record = await this.prisma.translationQualityScore.findUnique({
      where: { translationId },
    });

    if (!record) {
      return null;
    }

    return {
      score: this.formatStoredScore(record),
      contentHash: record.contentHash,
    };
  }

  /**
   * Get quality summary for a branch.
   *
   * Calculates aggregate statistics across all translations.
   *
   * @param branchId - Branch to summarize
   * @returns Summary with averages, distribution, and per-language stats
   */
  async getBranchSummary(branchId: string): Promise<BranchQualitySummary> {
    const translations = await this.prisma.translation.findMany({
      where: {
        key: { branchId },
        value: { not: '' },
      },
      include: { qualityScore: true },
    });

    const scored = translations.filter((t) => t.qualityScore);
    const scores = scored.map((t) => t.qualityScore!.score);

    const distribution = {
      excellent: scores.filter((s) => s >= 80).length,
      good: scores.filter((s) => s >= 60 && s < 80).length,
      needsReview: scores.filter((s) => s < 60).length,
    };

    // Group by language
    const byLanguage: Record<string, { total: number; count: number }> = {};
    for (const t of scored) {
      if (!byLanguage[t.language]) {
        byLanguage[t.language] = { total: 0, count: 0 };
      }
      byLanguage[t.language].total += t.qualityScore!.score;
      byLanguage[t.language].count += 1;
    }

    const byLanguageAvg: Record<string, { average: number; count: number }> = {};
    for (const [lang, data] of Object.entries(byLanguage)) {
      byLanguageAvg[lang] = {
        average: Math.round(data.total / data.count),
        count: data.count,
      };
    }

    return {
      averageScore:
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      distribution,
      byLanguage: byLanguageAvg,
      totalScored: scored.length,
      totalTranslations: translations.length,
    };
  }

  /**
   * Delete a quality score.
   *
   * @param translationId - Translation whose score to delete
   */
  async delete(translationId: string): Promise<void> {
    await this.prisma.translationQualityScore.deleteMany({
      where: { translationId },
    });
  }

  /**
   * Delete all scores for a branch.
   *
   * @param branchId - Branch whose scores to delete
   */
  async deleteByBranch(branchId: string): Promise<number> {
    const result = await this.prisma.translationQualityScore.deleteMany({
      where: {
        translation: {
          key: { branchId },
        },
      },
    });
    return result.count;
  }

  /**
   * Format a stored Prisma record to QualityScore.
   *
   * @param stored - Prisma record
   * @returns Formatted quality score
   */
  formatStoredScore(stored: PrismaQualityScore): QualityScore {
    return {
      score: stored.score,
      accuracy: stored.accuracyScore ?? undefined,
      fluency: stored.fluencyScore ?? undefined,
      terminology: stored.terminologyScore ?? undefined,
      format: stored.formatScore,
      passed: stored.score >= 80,
      needsAIEvaluation: false,
      issues: stored.issues as unknown as QualityIssue[],
      evaluationType: stored.evaluationType as 'heuristic' | 'ai' | 'hybrid',
      cached: true,
    };
  }
}
