import type { TranslationKey } from '@/lib/api';
import { queueBatchQuality } from '@/lib/api/quality';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseKeyQualityEvaluationOptions {
  branchId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useKeyQualityEvaluation({
  branchId,
  onSuccess,
  onError,
}: UseKeyQualityEvaluationOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (keyData: TranslationKey) => {
      const translationIds = keyData.translations.map((t) => t.id);
      if (translationIds.length === 0) {
        throw new Error('No translations to evaluate');
      }
      return queueBatchQuality(branchId, translationIds);
    },
    onSuccess: () => {
      // Invalidate keys query to refresh quality scores
      queryClient.invalidateQueries({ queryKey: ['branch-keys', branchId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });

  return {
    evaluateKeyQuality: mutation.mutate,
    evaluateKeyQualityAsync: mutation.mutateAsync,
    isEvaluating: mutation.isPending,
    error: mutation.error,
  };
}
