/**
 * Translation Memory Hooks
 *
 * Custom hooks for translation memory search and usage tracking.
 */
import { translationMemoryApi, type TMMatch, type TMSearchParams } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Search translation memory for similar translations.
 * Includes debounce-friendly behavior with enabled flag.
 *
 * @param projectId - Project ID
 * @param params - Search parameters (sourceText, languages)
 * @param options - Query options
 * @returns React Query result with TM matches
 */
export function useTranslationMemorySearch(
  projectId: string,
  params: TMSearchParams | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['tm-search', projectId, params],
    queryFn: () => translationMemoryApi.search(projectId, params!),
    // Only search if we have valid params and text is >= 3 chars
    enabled: options?.enabled !== false && !!params && !!projectId && params.sourceText.length >= 3,
    // Cache results briefly to avoid re-fetching on rapid typing
    staleTime: 30 * 1000, // 30 seconds
    // Don't retry on 404 (no matches found)
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Record when a TM suggestion is applied.
 * Increments the usage count for better ranking.
 *
 * @param projectId - Project ID
 * @returns Mutation to record TM usage
 */
export function useRecordTMUsage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => translationMemoryApi.recordUsage(projectId, entryId),
    // Optimistically update the cache to show incremented usage
    onSuccess: () => {
      // Invalidate TM search results to reflect updated usage counts
      queryClient.invalidateQueries({ queryKey: ['tm-search', projectId] });
    },
  });
}

// Re-export types for convenience
export type { TMMatch, TMSearchParams };
