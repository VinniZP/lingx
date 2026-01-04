/**
 * Related Keys Scoring Utility
 *
 * Implements the same scoring algorithm used for AI context selection.
 * This ensures consistent prioritization across frontend and backend.
 */
import type { RelatedKey, RelationshipType } from '@/lib/api';

/**
 * Priority weights for relationship types.
 * Higher values = more relevant context for translation.
 */
export const RELATIONSHIP_PRIORITY: Record<RelationshipType, number> = {
  NEARBY: 1.0, // Adjacent UI elements - highest relevance
  KEY_PATTERN: 0.9, // Same feature area naming pattern
  SAME_COMPONENT: 0.8, // Same component grouping
  SAME_FILE: 0.7, // Same source file
  SEMANTIC: 0.6, // Semantically similar content
};

/**
 * Boost factor for approved translations.
 * Approved translations are more reliable context.
 */
export const APPROVED_BOOST = 1.2;

export interface ScoredRelatedKey extends RelatedKey {
  type: RelationshipType;
  score: number;
}

/**
 * Calculate the relevance score for a related key.
 * Formula: priority * confidence * approvalBoost
 *
 * @param key - The related key with type
 * @param targetLanguage - Optional target language to check approval status
 * @returns Calculated score (higher = more relevant)
 */
export function calculateRelatedKeyScore(
  key: RelatedKey & { type: RelationshipType },
  targetLanguage?: string
): number {
  const priority = RELATIONSHIP_PRIORITY[key.type] ?? 0.5;

  // Check if has approved translation for target language
  const hasApproved =
    targetLanguage &&
    key.translations?.some((t) => t.language === targetLanguage && t.status === 'APPROVED');

  return priority * key.confidence * (hasApproved ? APPROVED_BOOST : 1.0);
}

/**
 * Sort related keys by relevance score (descending).
 * Uses the same algorithm as AI context selection.
 *
 * @param keys - Array of related keys with type
 * @param targetLanguage - Optional target language for approval boost
 * @returns Sorted array with scores attached
 */
export function sortRelatedKeysByScore(
  keys: Array<RelatedKey & { type: RelationshipType }>,
  targetLanguage?: string
): ScoredRelatedKey[] {
  return keys
    .map((key) => ({
      ...key,
      score: calculateRelatedKeyScore(key, targetLanguage),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Flatten relationship buckets into a single scored and sorted array.
 *
 * @param relationships - The relationships object from API
 * @param targetLanguage - Optional target language for approval boost
 * @returns Flat array sorted by score
 */
export function flattenAndSortRelationships(
  relationships: {
    sameFile: RelatedKey[];
    sameComponent: RelatedKey[];
    semantic: RelatedKey[];
    nearby: RelatedKey[];
    keyPattern: RelatedKey[];
  },
  targetLanguage?: string
): ScoredRelatedKey[] {
  const allKeys: Array<RelatedKey & { type: RelationshipType }> = [
    ...relationships.nearby.map((k) => ({ ...k, type: 'NEARBY' as const })),
    ...relationships.keyPattern.map((k) => ({ ...k, type: 'KEY_PATTERN' as const })),
    ...relationships.sameComponent.map((k) => ({ ...k, type: 'SAME_COMPONENT' as const })),
    ...relationships.sameFile.map((k) => ({ ...k, type: 'SAME_FILE' as const })),
    ...relationships.semantic.map((k) => ({ ...k, type: 'SEMANTIC' as const })),
  ];

  return sortRelatedKeysByScore(allKeys, targetLanguage);
}
