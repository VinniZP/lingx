/**
 * Custom hook for fetching user's projects with embedded statistics.
 * Uses React Query for caching and automatic refetching.
 */
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';

/**
 * Fetch all projects for the current user with stats.
 * Each project includes: totalKeys, translatedKeys, completionRate.
 *
 * @returns React Query result with projects list (includes stats)
 *
 * @example
 * ```tsx
 * function ProjectsList() {
 *   const { data, isLoading, error } = useProjects();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <ProjectsGrid projects={data.projects} />
 *     // Each project has: project.stats.totalKeys, project.stats.completionRate
 *   );
 * }
 * ```
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  });
}
