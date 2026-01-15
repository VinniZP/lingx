/**
 * Custom hook for project-level RBAC permission checks.
 * Fetches members list and determines current user's role and permissions.
 */
import { projectApi } from '@/lib/api';
import { memberApi, type ProjectRole } from '@/lib/api/members';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export type { ProjectRole };

export interface ProjectPermissions {
  /** Current user's role in the project (null if not a member or loading) */
  role: ProjectRole | null;
  /** True if user is OWNER */
  isOwner: boolean;
  /** True if user is MANAGER */
  isManager: boolean;
  /** True if user is DEVELOPER */
  isDeveloper: boolean;
  /** True if user is OWNER or MANAGER */
  canManageMembers: boolean;
  /** True if user is OWNER or MANAGER */
  canInviteMembers: boolean;
  /** True if user is OWNER or MANAGER */
  canManageSettings: boolean;
  /** True if user is OWNER or MANAGER */
  canManageIntegrations: boolean;
  /** True if user is OWNER only */
  canDeleteProject: boolean;
  /** True if user is OWNER only */
  canTransferOwnership: boolean;
  /** True if user is the only OWNER (constraints on leaving/transfer) */
  isOnlyOwner: boolean;
  /** True while data is being fetched */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
}

/**
 * Hook to get current user's permissions for a project.
 *
 * @param projectIdOrSlug - Project ID or slug from URL params
 * @returns ProjectPermissions object with role and permission flags
 *
 * @example
 * ```tsx
 * function SettingsPage({ projectId }: { projectId: string }) {
 *   const { canManageSettings, isLoading } = useProjectPermission(projectId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!canManageSettings) {
 *     redirect('/projects/' + projectId);
 *   }
 *
 *   return <SettingsForm />;
 * }
 * ```
 */
export function useProjectPermission(projectIdOrSlug: string): ProjectPermissions {
  const { user } = useAuth();

  // Fetch project to resolve slug to real ID
  const {
    data: project,
    isLoading: isLoadingProject,
    error: projectError,
  } = useQuery({
    queryKey: ['project', projectIdOrSlug],
    queryFn: () => projectApi.get(projectIdOrSlug),
    enabled: !!projectIdOrSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes - project data doesn't change often
  });

  const realProjectId = project?.id;

  // Fetch members to determine current user's role
  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useQuery({
    queryKey: ['project-members', realProjectId],
    queryFn: () => memberApi.list(realProjectId!),
    enabled: !!realProjectId,
    staleTime: 30 * 1000, // 30 seconds - members can change but not frequently
  });

  // Calculate permissions from members data
  const permissions = useMemo<Omit<ProjectPermissions, 'isLoading' | 'error'>>(() => {
    const members = membersData?.members || [];
    const currentMember = members.find((m) => m.userId === user?.id);
    const role = currentMember?.role || null;

    // Count owners for isOnlyOwner calculation
    const ownerCount = members.filter((m) => m.role === 'OWNER').length;

    const isOwner = role === 'OWNER';
    const isManager = role === 'MANAGER';
    const isDeveloper = role === 'DEVELOPER';
    const isManagerPlus = isOwner || isManager;

    return {
      role,
      isOwner,
      isManager,
      isDeveloper,
      canManageMembers: isManagerPlus,
      canInviteMembers: isManagerPlus,
      canManageSettings: isManagerPlus,
      canManageIntegrations: isManagerPlus,
      canDeleteProject: isOwner,
      canTransferOwnership: isOwner,
      isOnlyOwner: isOwner && ownerCount === 1,
    };
  }, [membersData, user?.id]);

  const isLoading = isLoadingProject || isLoadingMembers;
  const error = projectError || membersError;

  return {
    ...permissions,
    isLoading,
    error: error as Error | null,
  };
}
