'use client';

import { adminApi } from '@/lib/api/admin';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { AdminUserResponse, UserRole, UserStatus } from '@lingx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminUsersToolbar } from './_components/admin-users-toolbar';
import { DisableUserDialog } from './_components/disable-user-dialog';
import { EnableUserDialog } from './_components/enable-user-dialog';
import { UserRow } from './_components/user-row';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Filters from URL params
  const search = searchParams.get('search') || '';
  const role = (searchParams.get('role') as UserRole) || undefined;
  const status = (searchParams.get('status') as UserStatus) || undefined;

  // Dialog state
  const [userToDisable, setUserToDisable] = useState<AdminUserResponse | null>(null);
  const [userToEnable, setUserToEnable] = useState<AdminUserResponse | null>(null);

  // Query for users list
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', { search, role, status }],
    queryFn: () => adminApi.listUsers({ search: search || undefined, role, status }),
  });

  // Mutations
  const disableMutation = useMutation({
    mutationFn: (userId: string) => adminApi.disableUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserToDisable(null);
      toast.success(t('admin.disable.success'));
    },
    onError: () => {
      toast.error(t('admin.disable.error'));
    },
  });

  const enableMutation = useMutation({
    mutationFn: (userId: string) => adminApi.enableUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserToEnable(null);
      toast.success(t('admin.enable.success'));
    },
    onError: () => {
      toast.error(t('admin.enable.error'));
    },
  });

  // URL param handlers
  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.replace(`/admin/users?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    updateParams({ search: value || undefined });
  };

  const handleRoleChange = (value: UserRole | undefined) => {
    updateParams({ role: value });
  };

  const handleStatusChange = (value: UserStatus | undefined) => {
    updateParams({ status: value });
  };

  const handleViewDetails = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const handleDisable = (user: AdminUserResponse) => {
    setUserToDisable(user);
  };

  const handleEnable = (user: AdminUserResponse) => {
    setUserToEnable(user);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="stagger-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.users.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('admin.users.description')}</p>
      </div>

      {/* Main Content */}
      <div className="island stagger-2">
        {/* Toolbar */}
        <AdminUsersToolbar
          search={search}
          role={role}
          status={status}
          totalCount={data?.total || 0}
          onSearchChange={handleSearchChange}
          onRoleChange={handleRoleChange}
          onStatusChange={handleStatusChange}
        />

        {/* Users List */}
        <div className="divide-border/40 divide-y">
          {isLoading ? (
            // Loading state
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="bg-primary/10 size-12 animate-pulse rounded-xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="text-primary size-6" />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">Loading users...</p>
              </div>
            </div>
          ) : isError ? (
            // Error state
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-2xl">
                  <UserX className="text-destructive size-7" />
                </div>
                <p className="text-muted-foreground text-sm">Failed to load users</p>
              </div>
            </div>
          ) : data?.users.length === 0 ? (
            // Empty state
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="bg-muted/50 flex size-14 items-center justify-center rounded-2xl">
                  <Users className="text-muted-foreground size-7" />
                </div>
                <div>
                  <p className="font-medium">{t('admin.users.emptyState')}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t('admin.users.emptyStateDescription')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Users list
            data?.users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onViewDetails={handleViewDetails}
                onDisable={() => handleDisable(user)}
                onEnable={() => handleEnable(user)}
              />
            ))
          )}
        </div>
      </div>

      {/* Dialogs */}
      <DisableUserDialog
        user={userToDisable}
        onOpenChange={(open) => !open && setUserToDisable(null)}
        onConfirm={() => userToDisable && disableMutation.mutate(userToDisable.id)}
        isPending={disableMutation.isPending}
      />

      <EnableUserDialog
        user={userToEnable}
        onOpenChange={(open) => !open && setUserToEnable(null)}
        onConfirm={() => userToEnable && enableMutation.mutate(userToEnable.id)}
        isPending={enableMutation.isPending}
      />
    </div>
  );
}
