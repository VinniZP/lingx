import { getKeyQualityIssues } from '@/lib/api/quality';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch quality issues for all translations of a key
 * Issues are grouped by language code
 */
export function useKeyQualityIssues(keyId: string | null) {
  return useQuery({
    queryKey: ['key-quality-issues', keyId],
    queryFn: () => getKeyQualityIssues(keyId!),
    enabled: !!keyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
