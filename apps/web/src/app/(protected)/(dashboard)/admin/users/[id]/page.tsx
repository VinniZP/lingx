'use client';

import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api/admin';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldAlert, Users } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { DisableUserDialog } from '../_components/disable-user-dialog';
import { EnableUserDialog } from '../_components/enable-user-dialog';
import { ImpersonateUserDialog } from './_components/impersonate-user-dialog';
import { UserActionsSection } from './_components/user-actions-section';
import { UserProfileHeader } from './_components/user-profile-header';
import { UserProjectsSection } from './_components/user-projects-section';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Dialog state
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);

  // Query for user details
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminApi.getUserDetails(id),
  });

  // Mutations
  const disableMutation = useMutation({
    mutationFn: () => adminApi.disableUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowDisableDialog(false);
      toast.success(t('admin.disable.success'));
    },
    onError: () => {
      toast.error(t('admin.disable.error'));
    },
  });

  const enableMutation = useMutation({
    mutationFn: () => adminApi.enableUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowEnableDialog(false);
      toast.success(t('admin.enable.success'));
    },
    onError: () => {
      toast.error(t('admin.enable.error'));
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => adminApi.impersonateUser(id),
    onSuccess: () => {
      // Backend sets httpOnly cookies - just show success and redirect
      toast.success(t('admin.impersonate.success', { name: user?.name || user?.email || '' }));
      setShowImpersonateDialog(false);

      // Force full page reload to ensure all components pick up the new session
      window.location.href = '/dashboard';
    },
    onError: () => {
      toast.error(t('admin.impersonate.error'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="bg-primary/10 size-12 animate-pulse rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="text-primary size-6" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Loading user...</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-2xl">
            <ShieldAlert className="text-destructive size-7" />
          </div>
          <div>
            <p className="font-medium">User not found</p>
            <p className="text-muted-foreground mt-1 text-sm">
              The user you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 size-4" />
              Back to Users
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back Button */}
      <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground -ml-2">
        <Link href="/admin/users">
          <ArrowLeft className="mr-2 size-4" />
          Back to Users
        </Link>
      </Button>

      {/* Profile Header */}
      <div className="island stagger-1 p-6">
        <UserProfileHeader user={user} />
      </div>

      {/* Projects Section */}
      <div className="stagger-2">
        <UserProjectsSection projects={user.projects} />
      </div>

      {/* Actions Section */}
      <div className="stagger-3">
        <UserActionsSection
          user={user}
          onDisable={() => setShowDisableDialog(true)}
          onEnable={() => setShowEnableDialog(true)}
          onImpersonate={() => setShowImpersonateDialog(true)}
          isDisabling={disableMutation.isPending}
          isEnabling={enableMutation.isPending}
          isImpersonating={impersonateMutation.isPending}
        />
      </div>

      {/* Dialogs */}
      <DisableUserDialog
        user={showDisableDialog ? user : null}
        onOpenChange={(open) => !open && setShowDisableDialog(false)}
        onConfirm={() => disableMutation.mutate()}
        isPending={disableMutation.isPending}
      />

      <EnableUserDialog
        user={showEnableDialog ? user : null}
        onOpenChange={(open) => !open && setShowEnableDialog(false)}
        onConfirm={() => enableMutation.mutate()}
        isPending={enableMutation.isPending}
      />

      <ImpersonateUserDialog
        user={showImpersonateDialog ? user : null}
        onOpenChange={(open) => !open && setShowImpersonateDialog(false)}
        onConfirm={() => impersonateMutation.mutate()}
        isPending={impersonateMutation.isPending}
      />
    </div>
  );
}
