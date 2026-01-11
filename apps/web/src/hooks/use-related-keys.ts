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
import { useQuery } from '@tanstack/react-query';

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
// Re-export types for convenience
export type {
  AIContextResponse,
  KeyContextStats,
  RelatedKey,
  RelatedKeysResponse,
  RelationshipType,
};
