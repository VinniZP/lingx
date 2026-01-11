/**
 * Translation Memory Repository
 *
 * Data access layer for translation memory operations.
 * Uses PostgreSQL pg_trgm extension for similarity matching.
 */
import type { PrismaClient, TranslationMemory } from '@prisma/client';

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

export interface TMIndexInput {
  projectId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  targetText: string;
  sourceKeyId?: string;
  sourceBranchId?: string;
}

export interface ApprovedTranslationRow {
  targetLanguage: string;
  targetText: string;
  keyId: string;
  branchId: string;
  sourceText: string;
  sourceLanguage: string;
}

export interface TranslationWithContext {
  id: string;
  status: string;
  language: string;
  value: string;
  keyId: string;
  branchId: string;
  defaultLanguageCode: string | null;
  sourceText: string | null;
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

  /**
   * Upsert a translation memory entry.
   * Creates new entry or updates existing one based on unique constraint.
   */
  async upsertEntry(input: TMIndexInput): Promise<TranslationMemory> {
    if (!input.sourceText.trim() || !input.targetText.trim()) {
      throw new Error('Cannot index empty translations');
    }

    return this.prisma.translationMemory.upsert({
      where: {
        projectId_sourceLanguage_targetLanguage_sourceText: {
          projectId: input.projectId,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          sourceText: input.sourceText,
        },
      },
      update: {
        targetText: input.targetText,
        sourceKeyId: input.sourceKeyId,
        sourceBranchId: input.sourceBranchId,
        updatedAt: new Date(),
      },
      create: {
        projectId: input.projectId,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        sourceText: input.sourceText,
        targetText: input.targetText,
        sourceKeyId: input.sourceKeyId,
        sourceBranchId: input.sourceBranchId,
      },
    });
  }

  /**
   * Record usage of a TM entry (increment usage count).
   * @returns true if entry was found and updated, false otherwise.
   */
  async recordUsage(entryId: string): Promise<boolean> {
    const result = await this.prisma.translationMemory.updateMany({
      where: { id: entryId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  /**
   * Delete all TM entries for a source key.
   * @returns Number of deleted entries.
   */
  async deleteBySourceKey(keyId: string): Promise<number> {
    const result = await this.prisma.translationMemory.deleteMany({
      where: { sourceKeyId: keyId },
    });
    return result.count;
  }

  /**
   * Get all approved translations for a project for bulk indexing.
   * Returns translations paired with their source language (default language) text.
   */
  async getApprovedTranslationsForIndexing(projectId: string): Promise<ApprovedTranslationRow[]> {
    return this.prisma.$queryRaw<ApprovedTranslationRow[]>`
      SELECT
        t.language as "targetLanguage",
        t.value as "targetText",
        tk.id as "keyId",
        tk."branchId",
        src.value as "sourceText",
        src.language as "sourceLanguage"
      FROM "Translation" t
      JOIN "TranslationKey" tk ON t."keyId" = tk.id
      JOIN "Branch" b ON tk."branchId" = b.id
      JOIN "Space" s ON b."spaceId" = s.id
      JOIN "Translation" src ON src."keyId" = tk.id
      JOIN "ProjectLanguage" pl ON pl."projectId" = s."projectId"
        AND pl.code = src.language AND pl."isDefault" = true
      WHERE s."projectId" = ${projectId}
        AND t.status = 'APPROVED'
        AND t.language != src.language
        AND t.value IS NOT NULL AND t.value != ''
        AND src.value IS NOT NULL AND src.value != ''
    `;
  }

  /**
   * Get a translation with its context (default language source text) for indexing.
   * Returns null if translation not found.
   */
  async getTranslationWithContext(translationId: string): Promise<TranslationWithContext | null> {
    const results = await this.prisma.$queryRaw<TranslationWithContext[]>`
      SELECT
        t.id,
        t.status,
        t.language,
        t.value,
        t."keyId",
        tk."branchId",
        pl.code as "defaultLanguageCode",
        src.value as "sourceText"
      FROM "Translation" t
      JOIN "TranslationKey" tk ON t."keyId" = tk.id
      JOIN "Branch" b ON tk."branchId" = b.id
      JOIN "Space" s ON b."spaceId" = s.id
      LEFT JOIN "ProjectLanguage" pl ON pl."projectId" = s."projectId" AND pl."isDefault" = true
      LEFT JOIN "Translation" src ON src."keyId" = tk.id AND src.language = pl.code
      WHERE t.id = ${translationId}
      LIMIT 1
    `;

    return results[0] ?? null;
  }

  /**
   * Bulk upsert translation memory entries.
   * Processes in batches within transactions for performance.
   */
  async bulkUpsert(projectId: string, entries: ApprovedTranslationRow[]): Promise<number> {
    const BATCH_SIZE = 100;
    let indexed = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      await this.prisma.$transaction(async (tx) => {
        for (const row of batch) {
          await tx.translationMemory.upsert({
            where: {
              projectId_sourceLanguage_targetLanguage_sourceText: {
                projectId,
                sourceLanguage: row.sourceLanguage,
                targetLanguage: row.targetLanguage,
                sourceText: row.sourceText,
              },
            },
            update: {
              targetText: row.targetText,
              sourceKeyId: row.keyId,
              sourceBranchId: row.branchId,
              updatedAt: new Date(),
            },
            create: {
              projectId,
              sourceLanguage: row.sourceLanguage,
              targetLanguage: row.targetLanguage,
              sourceText: row.sourceText,
              targetText: row.targetText,
              sourceKeyId: row.keyId,
              sourceBranchId: row.branchId,
            },
          });
          indexed++;
        }
      });
    }

    return indexed;
  }
}
