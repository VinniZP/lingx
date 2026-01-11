/**
 * Translation Memory Repository
 *
 * Data access layer for translation memory operations.
 * Uses PostgreSQL pg_trgm extension for similarity matching.
 */
import type { PrismaClient } from '@prisma/client';

export interface TMMatch {
  id: string;
  sourceText: string;
  targetText: string;
  similarity: number;
  matchType: 'exact' | 'fuzzy';
  usageCount: number;
  lastUsedAt: string;
}

export interface TMSearchOptions {
  projectId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  minSimilarity?: number;
  limit?: number;
}

export interface TMStats {
  totalEntries: number;
  languagePairs: Array<{
    sourceLanguage: string;
    targetLanguage: string;
    count: number;
  }>;
}

interface TMMatchRow {
  id: string;
  sourceText: string;
  targetText: string;
  similarity: number;
  usageCount: number;
  lastUsedAt: Date;
}

export class TranslationMemoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Search for similar translations using pg_trgm fuzzy matching.
   */
  async searchSimilar(options: TMSearchOptions): Promise<TMMatch[]> {
    const { projectId, sourceLanguage, targetLanguage, sourceText } = options;
    const minSimilarity = options.minSimilarity ?? 0.6;
    const limit = options.limit ?? 5;

    if (sourceText.length < 3) {
      return [];
    }

    const results = await this.prisma.$queryRaw<TMMatchRow[]>`
      SELECT
        id,
        "sourceText",
        "targetText",
        similarity("sourceText", ${sourceText}) as similarity,
        "usageCount",
        "lastUsedAt"
      FROM "TranslationMemory"
      WHERE "projectId" = ${projectId}
        AND "sourceLanguage" = ${sourceLanguage}
        AND "targetLanguage" = ${targetLanguage}
        AND similarity("sourceText", ${sourceText}) >= ${minSimilarity}
      ORDER BY similarity DESC, "usageCount" DESC, "lastUsedAt" DESC
      LIMIT ${limit}
    `;

    return results.map((row) => {
      const similarity = Number(row.similarity);
      return {
        id: row.id,
        sourceText: row.sourceText,
        targetText: row.targetText,
        similarity,
        matchType: similarity >= 1.0 ? 'exact' : 'fuzzy',
        usageCount: row.usageCount,
        lastUsedAt: row.lastUsedAt.toISOString(),
      };
    });
  }

  /**
   * Check if a TM entry belongs to a project.
   */
  async entryBelongsToProject(entryId: string, projectId: string): Promise<boolean> {
    const entry = await this.prisma.translationMemory.findFirst({
      where: { id: entryId, projectId },
      select: { id: true },
    });
    return entry !== null;
  }

  /**
   * Get translation memory statistics for a project
   */
  async getStats(projectId: string): Promise<TMStats> {
    const [totalResult, languagePairs] = await Promise.all([
      this.prisma.translationMemory.count({
        where: { projectId },
      }),
      this.prisma.translationMemory.groupBy({
        by: ['sourceLanguage', 'targetLanguage'],
        where: { projectId },
        _count: true,
      }),
    ]);

    return {
      totalEntries: totalResult,
      languagePairs: languagePairs.map((lp) => ({
        sourceLanguage: lp.sourceLanguage,
        targetLanguage: lp.targetLanguage,
        count: lp._count,
      })),
    };
  }
}
