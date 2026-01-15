'use client';

import { useProjectPermission, type ProjectRole } from '@/hooks/use-project-permission';
import { type ReactNode } from 'react';

interface RequireProjectRoleProps {
  /** Project ID or slug */
  projectId: string;
  /** Roles that are allowed to see the children */
  roles: ProjectRole[];
  /** What to render if user doesn't have required role (default: null) */
  fallback?: ReactNode;
  /** What to render while loading permissions (default: null) */
  loading?: ReactNode;
  /** Content to render if user has required role */
  children: ReactNode;
}

/**
 * Conditionally render children based on user's project role.
 *
 * @example
 * ```tsx
 * <RequireProjectRole projectId={projectId} roles={['OWNER']}>
 *   <DangerZone />
 * </RequireProjectRole>
 * ```
 */
export function RequireProjectRole({
  projectId,
  roles,
  fallback = null,
  loading = null,
  children,
}: RequireProjectRoleProps) {
  const { role, isLoading } = useProjectPermission(projectId);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (!role || !roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Convenience wrapper for OWNER-only content.
 *
 * @example
 * ```tsx
 * <OwnerOnly projectId={projectId}>
 *   <DeleteProjectButton />
 * </OwnerOnly>
 * ```
 */
export function OwnerOnly({
  projectId,
  fallback,
  loading,
  children,
}: Omit<RequireProjectRoleProps, 'roles'>) {
  return (
    <RequireProjectRole
      projectId={projectId}
      roles={['OWNER']}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </RequireProjectRole>
  );
}

/**
 * Convenience wrapper for MANAGER+ content (OWNER or MANAGER).
 *
 * @example
 * ```tsx
 * <ManagerPlus projectId={projectId}>
 *   <InviteButton />
 * </ManagerPlus>
 * ```
 */
export function ManagerPlus({
  projectId,
  fallback,
  loading,
  children,
}: Omit<RequireProjectRoleProps, 'roles'>) {
  return (
    <RequireProjectRole
      projectId={projectId}
      roles={['OWNER', 'MANAGER']}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </RequireProjectRole>
  );
}
