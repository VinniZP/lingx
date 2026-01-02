/**
 * Key Context Service
 *
 * Handles near-key context detection including:
 * - Source location metadata updates from CLI
 * - Building relationships between keys (same file, component, semantic)
 * - Retrieving related keys for translation UI
 * - Building AI context for translation assistance
 */
import { PrismaClient, RelationshipType, Prisma, ApprovalStatus } from '@prisma/client';

export interface KeyContextInput {
  name: string;
  namespace: string | null;
  sourceFile?: string;
  sourceLine?: number;
  sourceComponent?: string;
}

export interface RelatedKey {
  id: string;
  name: string;
  namespace: string | null;
  relationshipType: RelationshipType;
  confidence: number;
  sourceFile: string | null;
  sourceComponent: string | null;
  translations?: Array<{
    language: string;
    value: string;
    status: ApprovalStatus;
  }>;
}

export interface RelatedKeysResult {
  sameFile: RelatedKey[];
  sameComponent: RelatedKey[];
  semantic: RelatedKey[];
}

export interface AIContextTranslation {
  keyName: string;
  translations: Record<string, string>;
  relationshipType: RelationshipType;
  confidence: number;
}

export interface AIContextResult {
  relatedTranslations: AIContextTranslation[];
  suggestedTerms: Array<{
    term: string;
    translation: string;
    source: 'glossary' | 'related';
  }>;
  contextPrompt: string;
}

export class KeyContextService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Bulk update source location metadata for keys.
   */
  async updateKeyContext(
    branchId: string,
    contexts: KeyContextInput[]
  ): Promise<{ updated: number; notFound: number }> {
    let updated = 0;
    let notFound = 0;

    // Process in batches for performance
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

    // Rebuild source-based relationships after update
    await this.buildSourceRelationships(branchId);

    return { updated, notFound };
  }

  /**
   * Build file/component relationships from source metadata.
   */
  async buildSourceRelationships(branchId: string): Promise<{
    fileRelationships: number;
    componentRelationships: number;
  }> {
    // Get all keys for this branch with source info
    const keys = await this.prisma.translationKey.findMany({
      where: {
        branchId,
        OR: [
          { sourceFile: { not: null } },
          { sourceComponent: { not: null } },
        ],
      },
      select: {
        id: true,
        sourceFile: true,
        sourceComponent: true,
      },
    });

    // Clear existing source-based relationships for this branch
    await this.prisma.keyRelationship.deleteMany({
      where: {
        fromKey: { branchId },
        type: { in: ['SAME_FILE', 'SAME_COMPONENT'] },
      },
    });

    // Group keys by file
    const fileGroups = new Map<string, string[]>();
    for (const key of keys) {
      if (key.sourceFile) {
        const group = fileGroups.get(key.sourceFile) ?? [];
        group.push(key.id);
        fileGroups.set(key.sourceFile, group);
      }
    }

    // Group keys by component
    const componentGroups = new Map<string, string[]>();
    for (const key of keys) {
      if (key.sourceComponent) {
        const group = componentGroups.get(key.sourceComponent) ?? [];
        group.push(key.id);
        componentGroups.set(key.sourceComponent, group);
      }
    }

    // Create relationships
    const relationships: Prisma.KeyRelationshipCreateManyInput[] = [];

    // File relationships
    for (const [_file, keyIds] of fileGroups) {
      if (keyIds.length < 2) continue;
      for (let i = 0; i < keyIds.length; i++) {
        for (let j = i + 1; j < keyIds.length; j++) {
          relationships.push({
            fromKeyId: keyIds[i],
            toKeyId: keyIds[j],
            type: 'SAME_FILE',
            confidence: 1.0,
          });
        }
      }
    }

    // Component relationships (higher priority than file)
    for (const [_component, keyIds] of componentGroups) {
      if (keyIds.length < 2) continue;
      for (let i = 0; i < keyIds.length; i++) {
        for (let j = i + 1; j < keyIds.length; j++) {
          relationships.push({
            fromKeyId: keyIds[i],
            toKeyId: keyIds[j],
            type: 'SAME_COMPONENT',
            confidence: 1.0,
          });
        }
      }
    }

    // Batch insert relationships (skip duplicates)
    if (relationships.length > 0) {
      await this.prisma.keyRelationship.createMany({
        data: relationships,
        skipDuplicates: true,
      });
    }

    const fileRels = relationships.filter(r => r.type === 'SAME_FILE').length;
    const componentRels = relationships.filter(r => r.type === 'SAME_COMPONENT').length;

    return {
      fileRelationships: fileRels,
      componentRelationships: componentRels,
    };
  }

  /**
   * Compute semantic relationships using pg_trgm similarity.
   */
  async computeSemanticRelationships(
    branchId: string,
    sourceLanguage: string,
    minSimilarity: number = 0.7
  ): Promise<{ relationships: number }> {
    // Clear existing semantic relationships
    await this.prisma.keyRelationship.deleteMany({
      where: {
        fromKey: { branchId },
        type: 'SEMANTIC',
      },
    });

    // Find similar translations using pg_trgm
    const similar = await this.prisma.$queryRaw<
      Array<{ fromKeyId: string; toKeyId: string; similarity: number }>
    >`
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

    // Create relationships
    if (similar.length > 0) {
      await this.prisma.keyRelationship.createMany({
        data: similar.map((match) => ({
          fromKeyId: match.fromKeyId,
          toKeyId: match.toKeyId,
          type: 'SEMANTIC' as RelationshipType,
          confidence: match.similarity,
        })),
        skipDuplicates: true,
      });
    }

    return { relationships: similar.length };
  }

  /**
   * Get related keys for a specific key.
   */
  async getRelatedKeys(
    keyId: string,
    options: {
      types?: RelationshipType[];
      limit?: number;
      includeTranslations?: boolean;
    } = {}
  ): Promise<RelatedKeysResult> {
    const limit = options.limit ?? 10;
    const types = options.types ?? ['SAME_FILE', 'SAME_COMPONENT', 'SEMANTIC'];

    // Build include based on options
    const keyInclude = options.includeTranslations
      ? { translations: { select: { language: true, value: true, status: true } } }
      : {};

    const relationships = await this.prisma.keyRelationship.findMany({
      where: {
        OR: [
          { fromKeyId: keyId, type: { in: types } },
          { toKeyId: keyId, type: { in: types } },
        ],
      },
      include: {
        fromKey: {
          include: keyInclude,
        },
        toKey: {
          include: keyInclude,
        },
      },
      orderBy: { confidence: 'desc' },
    });

    const result: RelatedKeysResult = {
      sameFile: [],
      sameComponent: [],
      semantic: [],
    };

    const seenIds = new Set<string>();

    for (const rel of relationships) {
      const relatedKey = rel.fromKeyId === keyId ? rel.toKey : rel.fromKey;

      // Skip duplicates
      if (seenIds.has(relatedKey.id)) continue;
      seenIds.add(relatedKey.id);

      // Cast to get translations if included
      const keyWithTranslations = relatedKey as typeof relatedKey & {
        translations?: Array<{ language: string; value: string; status: ApprovalStatus }>;
      };

      const entry: RelatedKey = {
        id: relatedKey.id,
        name: relatedKey.name,
        namespace: relatedKey.namespace,
        relationshipType: rel.type,
        confidence: rel.confidence,
        sourceFile: relatedKey.sourceFile,
        sourceComponent: relatedKey.sourceComponent,
        translations: options.includeTranslations && keyWithTranslations.translations
          ? keyWithTranslations.translations.map((t) => ({
              language: t.language,
              value: t.value,
              status: t.status,
            }))
          : undefined,
      };

      const bucket =
        rel.type === 'SAME_FILE'
          ? 'sameFile'
          : rel.type === 'SAME_COMPONENT'
            ? 'sameComponent'
            : 'semantic';

      if (result[bucket].length < limit) {
        result[bucket].push(entry);
      }
    }

    return result;
  }

  /**
   * Get AI context for a key (for translation UI).
   */
  async getAIContext(
    keyId: string,
    targetLanguage: string,
    sourceLanguage: string
  ): Promise<AIContextResult> {
    const related = await this.getRelatedKeys(keyId, {
      limit: 5,
      includeTranslations: true,
    });

    // Combine all related keys, prioritizing SAME_COMPONENT
    const allRelated: Array<RelatedKey & { type: RelationshipType }> = [
      ...related.sameComponent.map((k) => ({ ...k, type: 'SAME_COMPONENT' as RelationshipType })),
      ...related.sameFile.map((k) => ({ ...k, type: 'SAME_FILE' as RelationshipType })),
      ...related.semantic.map((k) => ({ ...k, type: 'SEMANTIC' as RelationshipType })),
    ];

    // Build related translations
    const relatedTranslations: AIContextTranslation[] = allRelated.map((k) => ({
      keyName: k.name,
      translations: Object.fromEntries(
        k.translations?.map((t) => [t.language, t.value]) ?? []
      ),
      relationshipType: k.type,
      confidence: k.confidence,
    }));

    // Extract terms from related translations (simple approach)
    const suggestedTerms: AIContextResult['suggestedTerms'] = [];
    // Could integrate with GlossaryService here for richer terms

    // Build context prompt
    const contextPrompt = this.buildContextPrompt(
      relatedTranslations,
      targetLanguage,
      sourceLanguage
    );

    return { relatedTranslations, suggestedTerms, contextPrompt };
  }

  /**
   * Build a context prompt for AI translation.
   */
  private buildContextPrompt(
    related: AIContextTranslation[],
    targetLanguage: string,
    sourceLanguage: string
  ): string {
    if (related.length === 0) return '';

    // Filter to entries that have both source and target translations
    const withBoth = related.filter(
      (r) => r.translations[sourceLanguage] && r.translations[targetLanguage]
    );

    if (withBoth.length === 0) return '';

    const examples = withBoth
      .slice(0, 3)
      .map(
        (r) =>
          `- "${r.translations[sourceLanguage]}" → "${r.translations[targetLanguage]}"`
      )
      .join('\n');

    return `Here are similar translations in this project for context:\n${examples}`;
  }

  /**
   * Get relationship counts for a branch (for stats).
   */
  async getRelationshipStats(branchId: string): Promise<{
    sameFile: number;
    sameComponent: number;
    semantic: number;
    keysWithSource: number;
  }> {
    const [sameFile, sameComponent, semantic, keysWithSource] = await Promise.all([
      this.prisma.keyRelationship.count({
        where: { fromKey: { branchId }, type: 'SAME_FILE' },
      }),
      this.prisma.keyRelationship.count({
        where: { fromKey: { branchId }, type: 'SAME_COMPONENT' },
      }),
      this.prisma.keyRelationship.count({
        where: { fromKey: { branchId }, type: 'SEMANTIC' },
      }),
      this.prisma.translationKey.count({
        where: {
          branchId,
          OR: [{ sourceFile: { not: null } }, { sourceComponent: { not: null } }],
        },
      }),
    ]);

    return { sameFile, sameComponent, semantic, keysWithSource };
  }
}
