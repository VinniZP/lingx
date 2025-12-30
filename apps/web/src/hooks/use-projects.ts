/**
 * Custom hook for fetching user's projects.
 * Uses React Query for caching and automatic refetching.
 */
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';

/**
 * Fetch all projects for the current user.
 *
 * @returns React Query result with projects list
 *
 * @example
 * ```tsx
 * function ProjectsList() {
 *   const { data, isLoading, error } = useProjects();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <ProjectsGrid projects={data.projects} />;
 * }
 * ```
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  });
}
