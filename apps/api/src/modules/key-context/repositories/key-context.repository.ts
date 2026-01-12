/**
 * Key Context Repository
 *
 * Data access layer for key context and relationships.
 * Encapsulates all Prisma calls for the key-context domain.
 */

import type {
  ApprovalStatus,
  KeyRelationship,
  Prisma,
  PrismaClient,
  RelationshipType,
  TranslationKey,
} from '@prisma/client';

// ============================================
// Types
// ============================================

/**
 * Key source information for building relationships
 */
export interface KeySourceInfo {
  id: string;
  sourceFile: string | null;
  sourceLine: number | null;
  sourceComponent: string | null;
}

/**
 * Key context input for bulk updates
 */
export interface KeyContextInput {
  name: string;
  namespace: string | null;
  sourceFile?: string;
  sourceLine?: number;
  sourceComponent?: string;
}

/**
 * Result of bulk key context update
 */
export interface UpdateKeySourceResult {
  updated: number;
  notFound: number;
}

/**
 * Semantic match from raw SQL query
 */
export interface SemanticMatch {
  fromKeyId: string;
  toKeyId: string;
  similarity: number;
}

/**
 * Relationship counts for statistics
 */
export interface RelationshipCounts {
  sameFile: number;
  sameComponent: number;
  semantic: number;
  nearby: number;
  keyPattern: number;
  keysWithSource: number;
}

/**
 * Key relationship with related keys
 */
export interface RelationshipWithKeys extends KeyRelationship {
  fromKey: TranslationKey & {
    translations?: Array<{
      language: string;
      value: string;
      status: ApprovalStatus;
    }>;
  };
  toKey: TranslationKey & {
    translations?: Array<{
      language: string;
      value: string;
      status: ApprovalStatus;
    }>;
  };
}

// ============================================
// Repository
// ============================================

/**
 * Repository for key context and relationship data access.
 *
 * Handles:
 * - Key source metadata updates
 * - Key relationship CRUD
 * - Semantic similarity queries (pg_trgm)
 * - Relationship statistics
 */
export class KeyContextRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Bulk update key source information.
   *
   * @param branchId - Branch containing the keys
   * @param contexts - Array of key context updates
   * @returns Count of updated and not found keys
   */
  async updateKeySourceInfo(
    branchId: string,
    contexts: KeyContextInput[]
  ): Promise<UpdateKeySourceResult> {
    let updated = 0;
    let notFound = 0;

    const batchSize = 100;
    for (let i = 0; i < contexts.length; i += batchSize) {
      const batch = contexts.slice(i, i + batchSize);

      await this.prisma.$transaction(async (tx) => {
        for (const ctx of batch) {
          const result = await tx.translationKey.updateMany({
            where: {
              branchId,
              name: ctx.name,
              namespace: ctx.namespace ?? null,
            },
            data: {
              sourceFile: ctx.sourceFile ?? null,
              sourceLine: ctx.sourceLine ?? null,
              sourceComponent: ctx.sourceComponent ?? null,
            },
          });
          if (result.count > 0) updated++;
          else notFound++;
        }
      });
    }

    return { updated, notFound };
  }

  /**
   * Find keys with source file or component metadata.
   */
  async findKeysWithSourceInfo(branchId: string): Promise<KeySourceInfo[]> {
    return this.prisma.translationKey.findMany({
      where: {
        branchId,
        OR: [{ sourceFile: { not: null } }, { sourceComponent: { not: null } }],
      },
      select: {
        id: true,
        sourceFile: true,
        sourceLine: true,
        sourceComponent: true,
      },
    });
  }

  /**
   * Delete source-based relationships (SAME_FILE, SAME_COMPONENT, NEARBY).
   */
  async deleteSourceBasedRelationships(branchId: string): Promise<void> {
    await this.prisma.keyRelationship.deleteMany({
      where: {
        fromKey: { branchId },
        type: { in: ['SAME_FILE', 'SAME_COMPONENT', 'NEARBY'] },
      },
    });
  }

  /**
   * Create key relationships in bulk.
   *
   * @param relationships - Relationships to create
   */
  async createRelationships(relationships: Prisma.KeyRelationshipCreateManyInput[]): Promise<void> {
    if (relationships.length === 0) return;

    await this.prisma.keyRelationship.createMany({
      data: relationships,
      skipDuplicates: true,
    });
  }

  /**
   * Find all keys in a branch (for key pattern computation).
   */
  async findBranchKeys(branchId: string): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.translationKey.findMany({
      where: { branchId },
      select: { id: true, name: true },
    });
  }

  /**
   * Delete KEY_PATTERN relationships for a branch.
   */
  async deleteKeyPatternRelationships(branchId: string): Promise<void> {
    await this.prisma.keyRelationship.deleteMany({
      where: {
        fromKey: { branchId },
        type: 'KEY_PATTERN',
      },
    });
  }

  /**
   * Delete SEMANTIC relationships for a branch.
   */
  async deleteSemanticRelationships(branchId: string): Promise<void> {
    await this.prisma.keyRelationship.deleteMany({
      where: {
        fromKey: { branchId },
        type: 'SEMANTIC',
      },
    });
  }

  /**
   * Find semantic matches using pg_trgm similarity.
   *
   * Uses raw SQL for pg_trgm extension.
   */
  async findSemanticMatches(
    branchId: string,
    sourceLanguage: string,
    minSimilarity: number
  ): Promise<SemanticMatch[]> {
    return this.prisma.$queryRaw<SemanticMatch[]>`
      SELECT DISTINCT ON (tk1.id, tk2.id)
        tk1.id as "fromKeyId",
        tk2.id as "toKeyId",
        similarity(t1.value, t2.value) as similarity
      FROM "TranslationKey" tk1
      JOIN "Translation" t1 ON t1."keyId" = tk1.id AND t1.language = ${sourceLanguage}
      JOIN "TranslationKey" tk2 ON tk2."branchId" = tk1."branchId" AND tk2.id > tk1.id
      JOIN "Translation" t2 ON t2."keyId" = tk2.id AND t2.language = ${sourceLanguage}
      WHERE tk1."branchId" = ${branchId}
        AND LENGTH(t1.value) > 10
        AND similarity(t1.value, t2.value) >= ${minSimilarity}
      ORDER BY tk1.id, tk2.id, similarity DESC
      LIMIT 1000
    `;
  }

  /**
   * Find relationships for a key.
   *
   * @param keyId - Key to find relationships for
   * @param types - Relationship types to include
   * @param includeTranslations - Whether to include translations
   */
  async findKeyRelationships(
    keyId: string,
    types: RelationshipType[],
    includeTranslations: boolean
  ): Promise<RelationshipWithKeys[]> {
    const keyInclude = includeTranslations
      ? { translations: { select: { language: true, value: true, status: true } } }
      : {};

    return this.prisma.keyRelationship.findMany({
      where: {
        OR: [
          { fromKeyId: keyId, type: { in: types } },
          { toKeyId: keyId, type: { in: types } },
        ],
      },
      include: {
        fromKey: includeTranslations ? { include: keyInclude } : true,
        toKey: includeTranslations ? { include: keyInclude } : true,
      },
      orderBy: { confidence: 'desc' },
    }) as unknown as Promise<RelationshipWithKeys[]>;
  }

  /**
   * Get relationship counts for a branch.
   */
  async getRelationshipCounts(branchId: string): Promise<RelationshipCounts> {
    const [sameFile, sameComponent, semantic, nearby, keyPattern, keysWithSource] =
      await Promise.all([
        this.prisma.keyRelationship.count({
          where: { fromKey: { branchId }, type: 'SAME_FILE' },
        }),
        this.prisma.keyRelationship.count({
          where: { fromKey: { branchId }, type: 'SAME_COMPONENT' },
        }),
        this.prisma.keyRelationship.count({
          where: { fromKey: { branchId }, type: 'SEMANTIC' },
        }),
        this.prisma.keyRelationship.count({
          where: { fromKey: { branchId }, type: 'NEARBY' },
        }),
        this.prisma.keyRelationship.count({
          where: { fromKey: { branchId }, type: 'KEY_PATTERN' },
        }),
        this.prisma.translationKey.count({
          where: {
            branchId,
            OR: [{ sourceFile: { not: null } }, { sourceComponent: { not: null } }],
          },
        }),
      ]);

    return { sameFile, sameComponent, semantic, nearby, keyPattern, keysWithSource };
  }
}
