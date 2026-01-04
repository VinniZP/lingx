/**
 * Key Context Service
 *
 * Handles near-key context detection including:
 * - Source location metadata updates from CLI
 * - Building relationships between keys (same file, component, semantic, nearby, key pattern)
 * - Distance-based confidence calculations
 * - Retrieving related keys for translation UI
 * - Building AI context for translation assistance
 */
import { ApprovalStatus, Prisma, PrismaClient, RelationshipType } from '@prisma/client';

// ============================================
// CONSTANTS
// ============================================

/** Maximum line distance for NEARBY relationships */
const NEARBY_MAX_DISTANCE = 30;

/** Decay constant for NEARBY confidence: e^(-distance / NEARBY_DECAY) */
const NEARBY_DECAY = 15;

/** Decay constant for SAME_FILE distance adjustment */
const SAME_FILE_DECAY = 50;

/** Decay constant for SAME_COMPONENT distance adjustment */
const SAME_COMPONENT_DECAY = 20;

/** Minimum confidence threshold for KEY_PATTERN relationships */
const KEY_PATTERN_MIN_CONFIDENCE = 0.5;

/** Priority weights for AI context selection */
const RELATIONSHIP_PRIORITY: Record<RelationshipType, number> = {
  NEARBY: 1.0,
  KEY_PATTERN: 0.9,
  SAME_COMPONENT: 0.8,
  SAME_FILE: 0.7,
  SEMANTIC: 0.6,
};

/** Boost factor for approved translations in AI context */
const APPROVED_BOOST = 1.2;

// ============================================
// CONFIDENCE FORMULAS
// ============================================

/**
 * Compute confidence for NEARBY relationship based on line distance.
 * Uses exponential decay: e^(-distance / 15)
 * Returns 0 if distance exceeds threshold.
 */
export function computeNearbyConfidence(distance: number): number {
  if (distance < 0 || distance > NEARBY_MAX_DISTANCE) return 0;
  return Math.exp(-distance / NEARBY_DECAY);
}

/**
 * Compute confidence for SAME_FILE relationship based on line distance.
 * Range: 0.6-1.0 using formula: 0.6 + 0.4 * e^(-distance / 50)
 */
export function computeSameFileConfidence(distance: number): number {
  if (distance < 0) return 1.0;
  return 0.6 + 0.4 * Math.exp(-distance / SAME_FILE_DECAY);
}

/**
 * Compute confidence for SAME_COMPONENT relationship based on line distance.
 * Range: 0.8-1.0 using formula: 0.8 + 0.2 * e^(-distance / 20)
 */
export function computeSameComponentConfidence(distance: number): number {
  if (distance < 0) return 1.0;
  return 0.8 + 0.2 * Math.exp(-distance / SAME_COMPONENT_DECAY);
}

/**
 * Compute KEY_PATTERN confidence based on key name similarity.
 * Uses LCP ratio + Jaccard similarity on key segments.
 * Formula: 0.6 * lcpRatio + 0.4 * jaccard
 */
export function computeKeyPatternConfidence(keyName1: string, keyName2: string): number {
  // Handle empty strings
  if (!keyName1 || !keyName2) return 0;

  const segments1 = keyName1.split('.').filter((s) => s.length > 0);
  const segments2 = keyName2.split('.').filter((s) => s.length > 0);

  // Handle empty segments after filtering
  if (segments1.length === 0 || segments2.length === 0) return 0;

  // Longest Common Prefix ratio
  let lcpLength = 0;
  const minLen = Math.min(segments1.length, segments2.length);
  for (let i = 0; i < minLen; i++) {
    if (segments1[i] === segments2[i]) {
      lcpLength++;
    } else {
      break;
    }
  }
  const lcpRatio = lcpLength / Math.max(segments1.length, segments2.length);

  // Jaccard similarity
  const set1 = new Set(segments1);
  const set2 = new Set(segments2);
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  const jaccard = union.size > 0 ? intersection.size / union.size : 0;

  return 0.6 * lcpRatio + 0.4 * jaccard;
}

// ============================================
// INTERFACES
// ============================================

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
  sourceLine?: number | null;
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
  nearby: RelatedKey[];
  keyPattern: RelatedKey[];
}

export interface AIContextTranslation {
  keyName: string;
  translations: Record<string, string>;
  relationshipType: RelationshipType;
  confidence: number;
  isApproved?: boolean;
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

// ============================================
// SERVICE
// ============================================

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
   * Build file/component/nearby relationships from source metadata.
   * Uses sourceLine for distance-based confidence calculations.
   *
   * ## Performance Characteristics
   *
   * **Time Complexity**: O(n²) within each file/component group
   * - For a file with k keys: O(k²) comparisons
   * - Total: Sum of O(k²) across all files
   *
   * **Typical Performance**:
   * - Well-structured projects have < 50 keys per file → O(50²) = 2,500 comparisons/file
   * - Even with 100 files × 2,500 = 250K comparisons → < 1 second
   *
   * **Warning Signs**:
   * - Single file with > 500 keys → 125K comparisons for that file alone
   * - Consider splitting large files or using namespace-based grouping
   */
  async buildSourceRelationships(branchId: string): Promise<{
    fileRelationships: number;
    componentRelationships: number;
    nearbyRelationships: number;
  }> {
    // Get all keys for this branch with source info
    const keys = await this.prisma.translationKey.findMany({
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

    // Clear existing source-based relationships for this branch
    await this.prisma.keyRelationship.deleteMany({
      where: {
        fromKey: { branchId },
        type: { in: ['SAME_FILE', 'SAME_COMPONENT', 'NEARBY'] },
      },
    });

    // Group keys by file (with line info)
    const fileGroups = new Map<
      string,
      Array<{ id: string; line: number | null; component: string | null }>
    >();
    for (const key of keys) {
      if (key.sourceFile) {
        const group = fileGroups.get(key.sourceFile) ?? [];
        group.push({ id: key.id, line: key.sourceLine, component: key.sourceComponent });
        fileGroups.set(key.sourceFile, group);
      }
    }

    // Group keys by component (with line info)
    const componentGroups = new Map<string, Array<{ id: string; line: number | null }>>();
    for (const key of keys) {
      if (key.sourceComponent) {
        const group = componentGroups.get(key.sourceComponent) ?? [];
        group.push({ id: key.id, line: key.sourceLine });
        componentGroups.set(key.sourceComponent, group);
      }
    }

    // Create relationships
    const relationships: Prisma.KeyRelationshipCreateManyInput[] = [];

    // File relationships (with distance-based confidence)
    for (const [_file, keysInFile] of fileGroups) {
      if (keysInFile.length < 2) continue;
      for (let i = 0; i < keysInFile.length; i++) {
        for (let j = i + 1; j < keysInFile.length; j++) {
          const key1 = keysInFile[i];
          const key2 = keysInFile[j];

          // Calculate distance if both have line numbers
          const distance =
            key1.line != null && key2.line != null ? Math.abs(key1.line - key2.line) : -1;

          // SAME_FILE relationship
          relationships.push({
            fromKeyId: key1.id,
            toKeyId: key2.id,
            type: 'SAME_FILE',
            confidence: computeSameFileConfidence(distance),
          });

          // NEARBY relationship (only if within threshold and different components)
          if (distance >= 0 && distance <= NEARBY_MAX_DISTANCE) {
            // Only create NEARBY if components are explicitly different
            // When both are null, keys already have SAME_FILE relationship
            // When both share same component, they have SAME_COMPONENT relationship
            if (key1.component !== key2.component) {
              const nearbyConfidence = computeNearbyConfidence(distance);
              if (nearbyConfidence > 0) {
                relationships.push({
                  fromKeyId: key1.id,
                  toKeyId: key2.id,
                  type: 'NEARBY',
                  confidence: nearbyConfidence,
                });
              }
            }
          }
        }
      }
    }

    // Component relationships (with distance-based confidence)
    for (const [_component, keysInComponent] of componentGroups) {
      if (keysInComponent.length < 2) continue;
      for (let i = 0; i < keysInComponent.length; i++) {
        for (let j = i + 1; j < keysInComponent.length; j++) {
          const key1 = keysInComponent[i];
          const key2 = keysInComponent[j];

          // Calculate distance if both have line numbers
          const distance =
            key1.line != null && key2.line != null ? Math.abs(key1.line - key2.line) : -1;

          relationships.push({
            fromKeyId: key1.id,
            toKeyId: key2.id,
            type: 'SAME_COMPONENT',
            confidence: computeSameComponentConfidence(distance),
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

    const fileRels = relationships.filter((r) => r.type === 'SAME_FILE').length;
    const componentRels = relationships.filter((r) => r.type === 'SAME_COMPONENT').length;
    const nearbyRels = relationships.filter((r) => r.type === 'NEARBY').length;

    return {
      fileRelationships: fileRels,
      componentRelationships: componentRels,
      nearbyRelationships: nearbyRels,
    };
  }

  /**
   * Compute KEY_PATTERN relationships based on key name similarity.
   * Uses LCP ratio + Jaccard similarity on key segments.
   *
   * ## Performance Characteristics
   *
   * **Time Complexity**: O(n²) where n = number of structured keys (keys containing '.')
   *
   * **Recommended Limits**:
   * - Optimal: < 1,000 keys (~500K comparisons, < 1 second)
   * - Acceptable: 1,000-5,000 keys (~12.5M comparisons, < 10 seconds)
   * - Warning: 5,000-10,000 keys (~50M comparisons, 30-60 seconds)
   * - Not recommended: > 10,000 keys (consider job queue processing)
   *
   * **Mitigation Strategies** (for future optimization):
   * 1. **Prefix grouping**: Only compare keys sharing first segment (e.g., "user.*")
   * 2. **LSH (Locality Sensitive Hashing)**: Approximate nearest neighbors
   * 3. **Job queue**: Process asynchronously via BullMQ for large projects
   * 4. **Incremental updates**: Only recompute affected keys on changes
   */
  async computeKeyPatternRelationships(branchId: string): Promise<{ relationships: number }> {
    // Get all keys in the branch
    const keys = await this.prisma.translationKey.findMany({
      where: { branchId },
      select: { id: true, name: true },
    });

    // Clear existing KEY_PATTERN relationships
    await this.prisma.keyRelationship.deleteMany({
      where: {
        fromKey: { branchId },
        type: 'KEY_PATTERN',
      },
    });

    // For performance, only process keys that have structured names (contain '.')
    const structuredKeys = keys.filter((k) => k.name.includes('.'));

    if (structuredKeys.length < 2) {
      return { relationships: 0 };
    }

    const relationships: Prisma.KeyRelationshipCreateManyInput[] = [];

    // Compare all pairs (O(n²) - may need optimization for large projects)
    // TODO: Consider LSH or prefix grouping for large projects
    for (let i = 0; i < structuredKeys.length; i++) {
      for (let j = i + 1; j < structuredKeys.length; j++) {
        const key1 = structuredKeys[i];
        const key2 = structuredKeys[j];

        const confidence = computeKeyPatternConfidence(key1.name, key2.name);

        if (confidence >= KEY_PATTERN_MIN_CONFIDENCE) {
          relationships.push({
            fromKeyId: key1.id,
            toKeyId: key2.id,
            type: 'KEY_PATTERN',
            confidence,
          });
        }
      }
    }

    // Batch insert (with limit to avoid memory issues)
    const batchSize = 5000;
    for (let i = 0; i < relationships.length; i += batchSize) {
      const batch = relationships.slice(i, i + batchSize);
      await this.prisma.keyRelationship.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    return { relationships: relationships.length };
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
    const types = options.types ?? [
      'SAME_FILE',
      'SAME_COMPONENT',
      'SEMANTIC',
      'NEARBY',
      'KEY_PATTERN',
    ];

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
      nearby: [],
      keyPattern: [],
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
        sourceLine: relatedKey.sourceLine,
        translations:
          options.includeTranslations && keyWithTranslations.translations
            ? keyWithTranslations.translations.map((t) => ({
                language: t.language,
                value: t.value,
                status: t.status,
              }))
            : undefined,
      };

      const bucket = this.getRelationshipBucket(rel.type);
      if (result[bucket].length < limit) {
        result[bucket].push(entry);
      }
    }

    return result;
  }

  /**
   * Map relationship type to bucket name.
   */
  private getRelationshipBucket(type: RelationshipType): keyof RelatedKeysResult {
    switch (type) {
      case 'SAME_FILE':
        return 'sameFile';
      case 'SAME_COMPONENT':
        return 'sameComponent';
      case 'SEMANTIC':
        return 'semantic';
      case 'NEARBY':
        return 'nearby';
      case 'KEY_PATTERN':
        return 'keyPattern';
      default: {
        // Exhaustive check: TypeScript will error if a new type is added
        const _exhaustive: never = type;
        throw new Error(`Unknown relationship type: ${_exhaustive}`);
      }
    }
  }

  /**
   * Get AI context for a key (for translation UI).
   * Uses smart selection with priority ordering.
   */
  async getAIContext(
    keyId: string,
    targetLanguage: string,
    sourceLanguage: string
  ): Promise<AIContextResult> {
    const related = await this.getRelatedKeys(keyId, {
      limit: 15, // Get more, then filter
      includeTranslations: true,
    });

    // Combine all related keys
    const allRelated: Array<RelatedKey & { type: RelationshipType }> = [
      ...related.nearby.map((k) => ({ ...k, type: 'NEARBY' as RelationshipType })),
      ...related.keyPattern.map((k) => ({ ...k, type: 'KEY_PATTERN' as RelationshipType })),
      ...related.sameComponent.map((k) => ({ ...k, type: 'SAME_COMPONENT' as RelationshipType })),
      ...related.sameFile.map((k) => ({ ...k, type: 'SAME_FILE' as RelationshipType })),
      ...related.semantic.map((k) => ({ ...k, type: 'SEMANTIC' as RelationshipType })),
    ];

    // Smart selection: filter to keys with target translation, score and sort
    const contextKeys = this.selectContextKeys(allRelated, targetLanguage, sourceLanguage);

    // Build related translations
    const relatedTranslations: AIContextTranslation[] = contextKeys.map((k) => {
      const hasApproved = k.translations?.some(
        (t) => t.language === targetLanguage && t.status === 'APPROVED'
      );
      return {
        keyName: k.name,
        translations: Object.fromEntries(k.translations?.map((t) => [t.language, t.value]) ?? []),
        relationshipType: k.type,
        confidence: k.confidence,
        isApproved: hasApproved,
      };
    });

    // Extract terms from related translations (simple approach)
    const suggestedTerms: AIContextResult['suggestedTerms'] = [];
    // Could integrate with GlossaryService here for richer terms

    // Build structured context prompt (XML format)
    const contextPrompt = this.buildStructuredContext(
      relatedTranslations,
      targetLanguage,
      sourceLanguage
    );

    return { relatedTranslations, suggestedTerms, contextPrompt };
  }

  /**
   * Smart selection of context keys for AI translation.
   * Prioritizes by relationship type, filters by target translation availability,
   * and boosts approved translations.
   */
  private selectContextKeys(
    keys: Array<RelatedKey & { type: RelationshipType }>,
    targetLanguage: string,
    _sourceLanguage: string
  ): Array<RelatedKey & { type: RelationshipType }> {
    // Filter to keys that have target language translation
    const withTarget = keys.filter((k) =>
      k.translations?.some((t) => t.language === targetLanguage)
    );

    // Score each key
    const scored = withTarget.map((k) => {
      const priority = RELATIONSHIP_PRIORITY[k.type] ?? 0.5;
      const hasApproved = k.translations?.some(
        (t) => t.language === targetLanguage && t.status === 'APPROVED'
      );
      const score = priority * k.confidence * (hasApproved ? APPROVED_BOOST : 1.0);
      return { ...k, score };
    });

    // Sort by score descending and take top 5
    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Build structured XML context for AI translation.
   */
  buildStructuredContext(
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

    const lines: string[] = ['<related_keys>'];

    for (const r of withBoth) {
      const escapedName = this.escapeXml(r.keyName);
      const escapedSource = this.escapeXml(r.translations[sourceLanguage]);
      const escapedTarget = this.escapeXml(r.translations[targetLanguage]);

      lines.push(
        `  <related_key name="${escapedName}" type="${r.relationshipType}" confidence="${r.confidence.toFixed(2)}"${r.isApproved ? ' approved="true"' : ''}>`
      );
      lines.push(`    <source lang="${sourceLanguage}">${escapedSource}</source>`);
      lines.push(`    <target lang="${targetLanguage}">${escapedTarget}</target>`);
      lines.push('  </related_key>');
    }

    lines.push('</related_keys>');

    return lines.join('\n');
  }

  /**
   * Escape special XML characters.
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Build a simple text context prompt for AI translation (legacy format).
   */
  buildContextPrompt(
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
      .map((r) => `- "${r.translations[sourceLanguage]}" → "${r.translations[targetLanguage]}"`)
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
    nearby: number;
    keyPattern: number;
    keysWithSource: number;
  }> {
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
