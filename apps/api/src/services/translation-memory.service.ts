/**
 * Translation Memory Service
 *
 * Handles translation memory operations including fuzzy search,
 * indexing approved translations, and tracking usage.
 * Uses PostgreSQL pg_trgm extension for similarity matching.
 */
import { PrismaClient, TranslationMemory } from '@prisma/client';

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

export interface TMIndexInput {
  projectId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  targetText: string;
  sourceKeyId?: string;
  sourceBranchId?: string;
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

export class TranslationMemoryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Search for similar translations using pg_trgm fuzzy matching
   *
   * @param options - Search parameters
   * @returns Array of matching translations with similarity scores
   */
  async searchSimilar(options: TMSearchOptions): Promise<TMMatch[]> {
    // Default to 0.6 (60%) for useful fuzzy matches
    const minSimilarity = options.minSimilarity ?? 0.6;
    const limit = options.limit ?? 5;

    // Skip search for very short strings (less useful for TM)
    if (options.sourceText.length < 3) {
      return [];
    }

    // Use raw SQL for pg_trgm similarity function
    const results = await this.prisma.$queryRaw<TMMatchRow[]>`
      SELECT
        id,
        "sourceText",
        "targetText",
        similarity("sourceText", ${options.sourceText}) as similarity,
        "usageCount",
        "lastUsedAt"
      FROM "TranslationMemory"
      WHERE "projectId" = ${options.projectId}
        AND "sourceLanguage" = ${options.sourceLanguage}
        AND "targetLanguage" = ${options.targetLanguage}
        AND similarity("sourceText", ${options.sourceText}) >= ${minSimilarity}
      ORDER BY
        similarity DESC,
        "usageCount" DESC,
        "lastUsedAt" DESC
      LIMIT ${limit}
    `;

    return results.map((row) => ({
      id: row.id,
      sourceText: row.sourceText,
      targetText: row.targetText,
      similarity: Number(row.similarity),
      matchType: Number(row.similarity) >= 1.0 ? 'exact' : 'fuzzy',
      usageCount: row.usageCount,
      lastUsedAt: row.lastUsedAt.toISOString(),
    }));
  }

  /**
   * Index a translation into translation memory
   * Creates or updates entry based on unique constraint
   *
   * @param input - Translation data to index
   */
  async indexTranslation(input: TMIndexInput): Promise<TranslationMemory> {
    // Skip empty translations
    if (!input.sourceText.trim() || !input.targetText.trim()) {
      throw new Error('Cannot index empty translations');
    }

    // Upsert: create or update if exists
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
   * Bulk index all approved translations for a project
   *
   * @param projectId - Project to index
   * @returns Count of indexed entries
   */
  async bulkIndex(projectId: string): Promise<{ indexed: number }> {
    // Get all approved translations with their default language counterpart
    const approvedTranslations = await this.prisma.$queryRaw<
      Array<{
        targetLanguage: string;
        targetText: string;
        keyId: string;
        branchId: string;
        sourceText: string;
        sourceLanguage: string;
      }>
    >`
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

    let indexed = 0;

    // Process in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < approvedTranslations.length; i += batchSize) {
      const batch = approvedTranslations.slice(i, i + batchSize);

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

    return { indexed };
  }

  /**
   * Record usage when a TM suggestion is applied
   * Increments usage count and updates lastUsedAt
   *
   * @param entryId - Translation memory entry ID
   */
  async recordUsage(entryId: string): Promise<void> {
    // Use updateMany to gracefully handle missing entries (won't throw if not found)
    await this.prisma.translationMemory.updateMany({
      where: { id: entryId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Remove a translation memory entry
   *
   * @param entryId - Entry to remove
   */
  async removeEntry(entryId: string): Promise<void> {
    await this.prisma.translationMemory.delete({
      where: { id: entryId },
    });
  }

  /**
   * Remove entries by source key (when key is deleted)
   *
   * @param keyId - Source key ID
   * @returns Count of removed entries
   */
  async removeBySourceKey(keyId: string): Promise<number> {
    const result = await this.prisma.translationMemory.deleteMany({
      where: { sourceKeyId: keyId },
    });
    return result.count;
  }

  /**
   * Get translation memory statistics for a project
   *
   * @param projectId - Project ID
   * @returns Statistics about TM entries
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
   * Get the project ID for a translation (for authorization)
   *
   * @param translationId - Translation ID
   * @returns Project ID
   */
  async getProjectIdByTranslationId(translationId: string): Promise<string | null> {
    const translation = await this.prisma.translation.findUnique({
      where: { id: translationId },
      select: {
        key: {
          select: {
            branch: {
              select: {
                space: {
                  select: {
                    projectId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return translation?.key.branch.space.projectId ?? null;
  }

  /**
   * Get default language translation for a key
   *
   * @param keyId - Translation key ID
   * @returns Default language translation or null
   */
  async getDefaultLanguageTranslation(
    keyId: string
  ): Promise<{ sourceLanguage: string; sourceText: string } | null> {
    const result = await this.prisma.$queryRaw<
      Array<{ sourceLanguage: string; sourceText: string }>
    >`
      SELECT
        t.language as "sourceLanguage",
        t.value as "sourceText"
      FROM "Translation" t
      JOIN "TranslationKey" tk ON t."keyId" = tk.id
      JOIN "Branch" b ON tk."branchId" = b.id
      JOIN "Space" s ON b."spaceId" = s.id
      JOIN "ProjectLanguage" pl ON pl."projectId" = s."projectId"
        AND pl.code = t.language AND pl."isDefault" = true
      WHERE tk.id = ${keyId}
        AND t.value IS NOT NULL AND t.value != ''
      LIMIT 1
    `;

    return result[0] ?? null;
  }
}
