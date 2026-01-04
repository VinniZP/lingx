/**
 * Related Keys Hooks
 *
 * Custom hooks for near-key context detection and related keys display.
 */
import {
  keyContextApi,
  type AIContextResponse,
  type KeyContextStats,
  type RelatedKey,
  type RelatedKeysResponse,
  type RelationshipType,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Get related keys for a translation key.
 * Fetches keys that are contextually related (same file, component, or semantically similar).
 *
 * @param branchId - Branch ID
 * @param keyId - Translation key ID
 * @param options - Query options
 * @returns React Query result with related keys grouped by relationship type
 */
export function useRelatedKeys(
  branchId: string,
  keyId: string | null,
  options?: {
    enabled?: boolean;
    types?: RelationshipType[];
    limit?: number;
    includeTranslations?: boolean;
  }
) {
  return useQuery({
    queryKey: ['related-keys', branchId, keyId, options?.types, options?.limit],
    queryFn: () =>
      keyContextApi.getRelatedKeys(branchId, keyId!, {
        types: options?.types,
        limit: options?.limit,
        includeTranslations: options?.includeTranslations ?? true,
      }),
    enabled: options?.enabled !== false && !!branchId && !!keyId,
    // Cache for 5 minutes - relationships don't change often
    staleTime: 5 * 60 * 1000,
    // Don't refetch on window focus for this data
    refetchOnWindowFocus: false,
  });
}

/**
 * Get all related keys as a flat array (convenience helper).
 * Ordered by priority: NEARBY > KEY_PATTERN > SAME_COMPONENT > SAME_FILE > SEMANTIC
 */
export function useAllRelatedKeys(
  branchId: string,
  keyId: string | null,
  options?: {
    enabled?: boolean;
    limit?: number;
  }
) {
  const query = useRelatedKeys(branchId, keyId, options);

  const allRelatedKeys: RelatedKey[] = query.data
    ? [
        ...query.data.relationships.nearby,
        ...query.data.relationships.keyPattern,
        ...query.data.relationships.sameComponent,
        ...query.data.relationships.sameFile,
        ...query.data.relationships.semantic,
      ]
    : [];

  return {
    ...query,
    allRelatedKeys,
    totalCount: allRelatedKeys.length,
  };
}

/**
 * Get AI context for translation assistance.
 * Includes related translations and suggested terms for better AI translation quality.
 *
 * @param branchId - Branch ID
 * @param keyId - Translation key ID
 * @param targetLanguage - Target language code
 * @param options - Query options
 * @returns React Query result with AI context
 */
export function useAIContext(
  branchId: string,
  keyId: string | null,
  targetLanguage: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['ai-context', branchId, keyId, targetLanguage],
    queryFn: () => keyContextApi.getAIContext(branchId, keyId!, targetLanguage!),
    enabled: options?.enabled !== false && !!branchId && !!keyId && !!targetLanguage,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get key context statistics for a branch.
 *
 * @param branchId - Branch ID
 * @returns React Query result with context stats
 */
export function useKeyContextStats(branchId: string) {
  return useQuery({
    queryKey: ['key-context-stats', branchId],
    queryFn: () => keyContextApi.getStats(branchId),
    enabled: !!branchId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Trigger semantic relationship analysis.
 *
 * @param branchId - Branch ID
 * @returns Mutation to trigger analysis
 */
export function useAnalyzeRelationships(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: { types?: RelationshipType[]; minSimilarity?: number }) =>
      keyContextApi.analyzeRelationships(branchId, options),
    onSuccess: () => {
      // Invalidate related queries after analysis
      queryClient.invalidateQueries({ queryKey: ['related-keys', branchId] });
      queryClient.invalidateQueries({ queryKey: ['key-context-stats', branchId] });
    },
  });
}

// Re-export types for convenience
export type {
  AIContextResponse,
  KeyContextStats,
  RelatedKey,
  RelatedKeysResponse,
  RelationshipType,
};
