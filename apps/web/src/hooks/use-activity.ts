/**
 * Activity Hooks
 *
 * Custom hooks for fetching activity data using React Query.
 */
import { useQuery } from '@tanstack/react-query';
import { activityApi, projectApi, type Activity, type ActivityChange } from '@/lib/api';

/**
 * Fetch recent user activities across all projects.
 * Used by the dashboard activity feed.
 *
 * @param limit - Max number of activities to fetch (default: 10)
 * @returns React Query result with activities
 */
export function useUserActivities(limit: number = 10) {
  return useQuery({
    queryKey: ['user-activities', limit],
    queryFn: () => activityApi.getUserActivities({ limit }),
    // Activities change frequently, refetch more often
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Fetch recent activities for a specific project.
 * Used by the project details page activity feed.
 *
 * @param projectId - Project ID
 * @param limit - Max number of activities to fetch (default: 10)
 * @returns React Query result with activities
 */
export function useProjectActivities(projectId: string, limit: number = 10) {
  return useQuery({
    queryKey: ['project-activities', projectId, limit],
    queryFn: () => projectApi.getActivity(projectId, { limit }),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Fetch full audit trail for a specific activity.
 * Used for the "View all changes" modal.
 *
 * @param activityId - Activity ID (null to disable)
 * @param limit - Max number of changes to fetch (default: 20)
 * @returns React Query result with changes and total
 */
export function useActivityChanges(activityId: string | null, limit: number = 20) {
  return useQuery({
    queryKey: ['activity-changes', activityId, limit],
    queryFn: () => activityApi.getActivityChanges(activityId!, { limit }),
    enabled: !!activityId,
    staleTime: 60 * 1000, // 1 minute (changes are immutable)
  });
}

// Re-export types for convenience
export type { Activity, ActivityChange };
