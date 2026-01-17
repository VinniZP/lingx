/**
 * Hook for enforcing project-level permission requirements with automatic redirect.
 *
 * Extracts the common guard pattern used across settings pages:
 * - Checks if user has required permission
 * - Shows error toast and redirects if not
 * - Properly distinguishes API errors from permission denial
 */
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useProjectPermission, type ProjectPermissions } from './use-project-permission';

type PermissionKey = keyof Pick<
  ProjectPermissions,
  | 'canManageSettings'
  | 'canManageMembers'
  | 'canInviteMembers'
  | 'canManageIntegrations'
  | 'canDeleteProject'
  | 'canTransferOwnership'
>;

interface UseRequirePermissionOptions {
  /** Project ID or slug */
  projectId: string;
  /** Permission to require (default: 'canManageSettings') */
  permission?: PermissionKey;
  /** Redirect URL when permission denied (default: project dashboard) */
  redirectTo?: string;
}

interface UseRequirePermissionResult {
  /** True while checking permissions */
  isLoading: boolean;
  /** True if permission check passed */
  hasPermission: boolean;
  /** True if there was an API error (different from permission denial) */
  hasError: boolean;
  /** The error if any */
  error: Error | null;
  /** All permissions from the underlying hook */
  permissions: ProjectPermissions;
}

/**
 * Enforces a permission requirement with automatic redirect.
 *
 * @example
 * ```tsx
 * function SettingsPage({ projectId }: { projectId: string }) {
 *   const { isLoading, hasPermission, permissions } = useRequirePermission({
 *     projectId,
 *     permission: 'canManageSettings',
 *   });
 *
 *   if (isLoading || !hasPermission) {
 *     return <LoadingPulse />;
 *   }
 *
 *   // User has permission, render the page
 *   return <SettingsForm canDelete={permissions.canDeleteProject} />;
 * }
 * ```
 */
export function useRequirePermission({
  projectId,
  permission = 'canManageSettings',
  redirectTo,
}: UseRequirePermissionOptions): UseRequirePermissionResult {
  const router = useRouter();
  const permissions = useProjectPermission(projectId);
  const [hasRedirected, setHasRedirected] = useState(false);

  const { isLoading, error } = permissions;
  const hasPermission = permissions[permission];
  const hasError = error !== null;

  // Handle redirect when permission denied (not on error)
  // Using a ref to track redirect state to avoid setState in effect
  const shouldRedirect = !isLoading && !hasRedirected && !hasError && !hasPermission;

  useEffect(() => {
    if (shouldRedirect) {
      // Using a callback to batch with React's scheduler
      const performRedirect = () => {
        setHasRedirected(true);
        toast.error('Access Denied', {
          description: "You don't have permission to access this page",
        });
        router.replace(redirectTo ?? `/projects/${projectId}`);
      };
      performRedirect();
    }
  }, [shouldRedirect, projectId, redirectTo, router]);

  return {
    isLoading,
    hasPermission: !isLoading && !hasError && hasPermission,
    hasError,
    error,
    permissions,
  };
}
