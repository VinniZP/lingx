/**
 * Custom hook for fetching dashboard statistics.
 * Uses React Query for caching and automatic refetching.
 */
import { dashboardApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetch dashboard statistics for the current user.
 *
 * @returns React Query result with dashboard stats
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { data: stats, isLoading, error } = useDashboardStats();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <StatsDisplay stats={stats} />;
 * }
 * ```
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    // Stats don't change frequently, cache for 2 minutes
    staleTime: 2 * 60 * 1000,
  });
}
