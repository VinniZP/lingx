/**
 * Quality Estimation Repository
 *
 * Data access layer for quality estimation operations.
 * Encapsulates all Prisma calls for the quality estimation domain.
 */

import type { QualityScoringConfig } from '@lingx/shared';
import type {
  AIProvider as AIProviderEnum,
  AITranslationConfig,
  PrismaClient,
  QualityScoringConfig as PrismaQualityScoringConfig,
  Translation,
  TranslationKey,
  TranslationQualityScore,
} from '@prisma/client';

// ============================================
// Types
// ============================================

/**
 * Translation data for batch evaluation with content hash for cache validation
 */
export interface BatchTranslationData {
  id: string;
  keyId: string;
  language: string;
  value: string;
  qualityScore: { contentHash: string | null } | null;
}

/**
 * Translation with full context for quality evaluation
 */
export interface TranslationWithContext extends Translation {
  key: TranslationKey & {
    branch: {
      id: string;
      space: {
        id: string;
        project: {
          id: string;
          defaultLanguage: string;
        };
      };
    };
  };
  qualityScore: TranslationQualityScore | null;
}

/**
 * Translation with optional quality score
 */
export interface TranslationWithScore extends Translation {
  qualityScore: TranslationQualityScore | null;
}

// ============================================
// Repository
// ============================================

/**
 * Repository for quality estimation data access.
 *
 * Follows the repository pattern to:
 * - Encapsulate all Prisma calls
 * - Provide a clean API for the service layer
 * - Enable easy testing with mocks
 */
export class QualityEstimationRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find a translation with full context for evaluation.
   *
   * Includes:
   * - Translation key
   * - Branch
   * - Space
   * - Project (for default language)
   * - Existing quality score (for cache validation)
   */
  async findTranslationWithContext(translationId: string): Promise<TranslationWithContext | null> {
    return this.prisma.translation.findUnique({
      where: { id: translationId },
      include: {
        key: {
          include: {
            branch: {
              include: {
                space: {
                  include: { project: true },
                },
              },
            },
          },
        },
        qualityScore: true,
      },
    }) as Promise<TranslationWithContext | null>;
  }

  /**
   * Find source translation for a key.
   *
   * @param keyId - Translation key ID
   * @param language - Source language code
   */
  async findSourceTranslation(keyId: string, language: string): Promise<Translation | null> {
    return this.prisma.translation.findFirst({
      where: {
        keyId,
        language,
      },
    });
  }

  /**
   * Find all translations for a key with their quality scores.
   *
   * Used for getting quality issues grouped by language.
   */
  async findTranslationsWithQualityScores(keyId: string): Promise<TranslationWithScore[]> {
    return this.prisma.translation.findMany({
      where: { keyId },
      include: { qualityScore: true },
    });
  }

  /**
   * Find quality scoring config for a project.
   */
  async findQualityConfig(projectId: string): Promise<PrismaQualityScoringConfig | null> {
    return this.prisma.qualityScoringConfig.findUnique({
      where: { projectId },
    });
  }

  /**
   * Create or update quality scoring config.
   */
  async upsertQualityConfig(
    projectId: string,
    input: Partial<QualityScoringConfig>
  ): Promise<void> {
    await this.prisma.qualityScoringConfig.upsert({
      where: { projectId },
      update: input,
      create: {
        projectId,
        ...input,
      },
    });
  }

  /**
   * Find AI translation config for a project and provider.
   *
   * Used to get API keys for AI evaluation.
   */
  async findAITranslationConfig(
    projectId: string,
    provider: AIProviderEnum | string
  ): Promise<AITranslationConfig | null> {
    return this.prisma.aITranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: provider as AIProviderEnum,
        },
      },
    });
  }

  /**
   * Find translations for batch evaluation.
   *
   * When translationIds is provided, fetches those specific translations.
   * Otherwise fetches all non-empty translations for the branch in the given languages.
   *
   * @param branchId - Branch ID to find translations for
   * @param languages - Languages to include
   * @param translationIds - Optional specific translation IDs to fetch
   */
  async findTranslationsForBatchEvaluation(
    branchId: string,
    languages: string[],
    translationIds?: string[]
  ): Promise<BatchTranslationData[]> {
    return this.prisma.translation.findMany({
      where: translationIds
        ? { id: { in: translationIds } }
        : {
            key: { branchId },
            value: { not: '' },
            language: { in: languages },
          },
      select: {
        id: true,
        keyId: true,
        language: true,
        value: true,
        qualityScore: {
          select: { contentHash: true },
        },
      },
    });
  }

  /**
   * Find source translations for a set of keys.
   *
   * Returns a Map of keyId -> source value for efficient lookup.
   *
   * @param keyIds - Key IDs to find source translations for
   * @param sourceLanguage - Source language code (e.g., 'en')
   */
  async findSourceTranslationsForKeys(
    keyIds: string[],
    sourceLanguage: string
  ): Promise<Map<string, string>> {
    if (keyIds.length === 0) {
      return new Map();
    }

    const sources = await this.prisma.translation.findMany({
      where: {
        keyId: { in: keyIds },
        language: sourceLanguage,
      },
      select: { keyId: true, value: true },
    });

    return new Map(sources.map((s) => [s.keyId, s.value]));
  }
}
