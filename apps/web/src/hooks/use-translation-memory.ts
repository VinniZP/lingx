/**
 * Translation Memory Hooks
 *
 * Custom hooks for translation memory search and usage tracking.
 */
import { translationMemoryApi, type TMMatch, type TMSearchParams } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
