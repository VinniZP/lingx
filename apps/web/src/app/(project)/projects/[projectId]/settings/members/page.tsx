'use client';

import { SettingsSectionHeader } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { projectApi } from '@/lib/api';
import { memberApi, MemberApiError } from '@/lib/api/members';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { AssignableRole } from '@lingx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Crown,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import { use, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { InvitationRow } from './_components/invitation-row';
import { InviteDialog } from './_components/invite-dialog';
import { LeaveProjectDialog } from './_components/leave-project-dialog';
import { MemberRow } from './_components/member-row';
import { RemoveMemberDialog } from './_components/remove-member-dialog';
import { TransferOwnershipDialog } from './_components/transfer-ownership-dialog';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function MembersPage({ params }: PageProps) {
  const { projectId } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    name: string | null;
    email: string;
  } | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  // Track which member is having their role changed
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);

  // Fetch project to get real ID (URL uses slug)
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  // Use real project ID for member API calls
  const realProjectId = project?.id;

  // Fetch members (wait for project to load to get real ID)
  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['project-members', realProjectId],
    queryFn: () => memberApi.list(realProjectId!),
    enabled: !!realProjectId,
  });

  const members = membersData?.members || [];
  const currentMember = members.find((m) => m.userId === user?.id);
  const currentUserRole = currentMember?.role || 'DEVELOPER';

  // Permission checks - OWNER and MANAGER can manage invitations
  const canManageInvitations = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER';

  // Count owners to determine if current user is only owner
  const ownerCount = members.filter((m) => m.role === 'OWNER').length;
  const isOnlyOwner = currentUserRole === 'OWNER' && ownerCount === 1;

  // Fetch invitations (only if user can manage them and project is loaded)
  const {
    data: invitationsData,
    isLoading: isLoadingInvitations,
    error: invitationsError,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: ['project-invitations', realProjectId],
    queryFn: () => memberApi.listInvitations(realProjectId!),
    enabled: canManageInvitations && !!realProjectId,
  });

  const invitations = invitationsData?.invitations || [];

  // Helper to get error message
  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (error instanceof MemberApiError) {
        return error.message;
      }
      if (error instanceof Error) {
        return error.message;
      }
      return t('common.unexpectedError');
    },
    [t]
  );

  // Mutations (all use realProjectId)
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AssignableRole }) =>
      memberApi.updateRole(realProjectId!, userId, { role }),
    onMutate: ({ userId }) => {
      setChangingRoleUserId(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', realProjectId] });
      toast.success(t('members.roleUpdated'));
    },
    onError: (error) => {
      toast.error(t('members.roleUpdateFailed'), {
        description: getErrorMessage(error),
      });
    },
    onSettled: () => {
      setChangingRoleUserId(null);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => memberApi.remove(realProjectId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', realProjectId] });
      toast.success(t('members.memberRemoved'));
      setMemberToRemove(null);
    },
    onError: (error) => {
      toast.error(t('members.removeFailed'), {
        description: getErrorMessage(error),
      });
    },
  });

  const leaveProjectMutation = useMutation({
    mutationFn: () => memberApi.leave(realProjectId!),
    onSuccess: () => {
      toast.success(t('members.leftProject'));
      // Redirect to projects list
      window.location.href = '/projects';
    },
    onError: (error) => {
      toast.error(t('members.leaveFailed'), {
        description: getErrorMessage(error),
      });
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: ({ newOwnerId, keepOwnership }: { newOwnerId: string; keepOwnership: boolean }) =>
      memberApi.transferOwnership(realProjectId!, { newOwnerId, keepOwnership }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', realProjectId] });
      toast.success(t('members.transfer.success'));
      setShowTransferDialog(false);
    },
    onError: (error) => {
      toast.error(t('members.transfer.failed'), {
        description: getErrorMessage(error),
      });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => memberApi.revokeInvitation(realProjectId!, invitationId),
    onMutate: (invitationId) => {
      setRevokingInvitationId(invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invitations', realProjectId] });
      toast.success(t('members.invitationRevoked'));
    },
    onError: (error) => {
      toast.error(t('members.revokeFailed'), {
        description: getErrorMessage(error),
      });
    },
    onSettled: () => {
      setRevokingInvitationId(null);
    },
  });

  // Memoized handlers to prevent unnecessary re-renders
  const handleRoleChange = useCallback(
    (userId: string, role: AssignableRole) => {
      updateRoleMutation.mutate({ userId, role });
    },
    [updateRoleMutation]
  );

  const handleRemove = useCallback(
    (userId: string) => {
      const m = members.find((mem) => mem.userId === userId);
      if (m) {
        setMemberToRemove({
          userId: m.userId,
          name: m.name,
          email: m.email,
        });
      }
    },
    [members]
  );

  const handleLeave = useCallback(() => {
    setShowLeaveDialog(true);
  }, []);

  const handleRevokeInvitation = useCallback(
    (invitationId: string) => {
      revokeInvitationMutation.mutate(invitationId);
    },
    [revokeInvitationMutation]
  );

  const handleTransferOwnership = useCallback(
    (newOwnerId: string, keepOwnership: boolean) => {
      transferOwnershipMutation.mutate({ newOwnerId, keepOwnership });
    },
    [transferOwnershipMutation]
  );

  // Loading state (wait for project and members)
  if (isLoadingProject || isLoadingMembers) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{t('members.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state for members query
  if (membersError) {
    const isNetworkError = !(membersError instanceof MemberApiError);
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-xl">
            <AlertCircle className="text-destructive size-6" />
          </div>
          <div>
            <p className="text-destructive text-sm font-medium">
              {isNetworkError ? t('common.connectionError') : t('members.loadFailed')}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {isNetworkError ? t('common.checkConnectionRetry') : getErrorMessage(membersError)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchMembers()} className="gap-2">
            <RefreshCw className="size-4" />
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Members Section */}
      <section className="animate-fade-in-up stagger-1">
        <div className="mb-6 flex items-center justify-between">
          <SettingsSectionHeader
            icon={Users}
            title={t('members.teamMembers')}
            description={t('members.teamMembersDescription')}
            color="primary"
          />
          {canManageInvitations && (
            <Button onClick={() => setShowInviteDialog(true)} className="h-11 gap-2">
              <UserPlus className="size-4.5" />
              {t('members.inviteMembers')}
            </Button>
          )}
        </div>

        <div className="island divide-border/40 divide-y">
          {members.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-muted/50 mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
                <Users className="text-muted-foreground size-5" />
              </div>
              <p className="text-muted-foreground text-sm">{t('members.noMembers')}</p>
            </div>
          ) : (
            members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                currentUserId={user?.id || ''}
                currentUserRole={currentUserRole}
                isOnlyOwner={isOnlyOwner}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
                onLeave={handleLeave}
                isChangingRole={changingRoleUserId === member.userId}
                isRemoving={
                  removeMemberMutation.isPending && memberToRemove?.userId === member.userId
                }
              />
            ))
          )}
        </div>
      </section>

      {/* Invitations Section (MANAGER+ only) */}
      {canManageInvitations && (
        <section className="animate-fade-in-up stagger-2">
          <SettingsSectionHeader
            icon={Mail}
            title={t('members.pendingInvitations')}
            description={t('members.pendingInvitationsDescription')}
            color="amber"
          />

          <div className="island divide-border/40 mt-6 divide-y">
            {isLoadingInvitations ? (
              <div className="p-8 text-center">
                <Loader2 className="text-primary mx-auto size-6 animate-spin" />
              </div>
            ) : invitationsError ? (
              <div className="p-8 text-center">
                <div className="bg-destructive/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
                  <AlertCircle className="text-destructive size-5" />
                </div>
                <p className="text-destructive text-sm">{t('members.invitationsLoadFailed')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchInvitations()}
                  className="mt-2 gap-2"
                >
                  <RefreshCw className="size-4" />
                  {t('common.retry')}
                </Button>
              </div>
            ) : invitations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-muted/50 mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
                  <Mail className="text-muted-foreground size-5" />
                </div>
                <p className="text-muted-foreground text-sm">{t('members.noInvitations')}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('members.noInvitationsDescription')}
                </p>
              </div>
            ) : (
              invitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  onRevoke={() => handleRevokeInvitation(invitation.id)}
                  isRevoking={revokingInvitationId === invitation.id}
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* Danger Zone (OWNER only) */}
      {currentUserRole === 'OWNER' && members.length > 1 && (
        <section className="animate-fade-in-up stagger-3">
          <SettingsSectionHeader
            icon={ShieldAlert}
            title={t('members.dangerZone')}
            description={t('members.dangerZoneDescription')}
            color="destructive"
          />

          <div className="island mt-6 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('members.transfer.title')}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {t('members.transfer.buttonDescription')}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowTransferDialog(true)}
                className="border-warning/50 text-warning hover:bg-warning/10 hover:text-warning h-11 gap-2"
              >
                <Crown className="size-4" />
                {t('members.transfer.transferOwnership')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Dialogs */}
      <InviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        projectId={realProjectId!}
        actorRole={currentUserRole}
      />

      {memberToRemove && (
        <RemoveMemberDialog
          open={!!memberToRemove}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          member={memberToRemove}
          onConfirm={() => removeMemberMutation.mutate(memberToRemove.userId)}
          isRemoving={removeMemberMutation.isPending}
        />
      )}

      <LeaveProjectDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onConfirm={() => leaveProjectMutation.mutate()}
        isLeaving={leaveProjectMutation.isPending}
      />

      {currentUserRole === 'OWNER' && members.length > 1 && (
        <TransferOwnershipDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          members={members}
          currentUserId={user?.id || ''}
          projectName={project?.name || ''}
          onConfirm={handleTransferOwnership}
          isTransferring={transferOwnershipMutation.isPending}
        />
      )}
    </div>
  );
}
