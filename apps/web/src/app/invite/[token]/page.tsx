'use client';

import { roleStyles } from '@/app/(project)/projects/[projectId]/settings/members/_components/role-selector';
import { Button } from '@/components/ui/button';
import { invitationApi, MemberApiError } from '@/lib/api/members';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  Check,
  Folder,
  Languages,
  Loader2,
  LogIn,
  PartyPopper,
  RefreshCw,
  UserPlus,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function AcceptInvitationPage({ params }: PageProps) {
  const { token } = use(params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [hasDeclined, setHasDeclined] = useState(false);
  const { t } = useTranslation();

  // Fetch invitation details
  const {
    data: invitation,
    isLoading: isInvitationLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationApi.getByToken(token),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => invitationApi.accept(token),
    onError: (err: MemberApiError) => {
      toast.error(t('invitation.acceptFailed'), {
        description: err.message || t('common.tryAgain'),
      });
    },
  });

  // Accept handler - capture invitation data before mutation to avoid stale data issues
  const handleAccept = useCallback(() => {
    if (!invitation) return;

    // Capture values before mutation to avoid undefined access
    const projectName = invitation.projectName;
    const projectSlug = invitation.projectSlug;

    acceptMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('invitation.welcomeToTeam'), {
          description: t('invitation.nowMemberOf', { projectName }),
        });
        router.push(`/projects/${projectSlug}`);
      },
    });
  }, [invitation, router, t, acceptMutation]);

  // Loading state
  if (isAuthLoading || isInvitationLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{t('invitation.loading')}</p>
        </div>
      </div>
    );
  }

  // Error/Invalid state - differentiate between network errors and invalid token
  if (error || !invitation) {
    const isNetworkError = error && !(error instanceof MemberApiError);

    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="animate-fade-in-up w-full max-w-md space-y-6 text-center">
          {/* Error Icon */}
          <div
            className={cn(
              'mx-auto flex size-16 items-center justify-center rounded-2xl border',
              isNetworkError
                ? 'from-warning/20 to-warning/5 border-warning/20 bg-linear-to-br'
                : 'from-destructive/20 to-destructive/5 border-destructive/20 bg-linear-to-br'
            )}
          >
            {isNetworkError ? (
              <WifiOff className="text-warning size-8" />
            ) : (
              <XCircle className="text-destructive size-8" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isNetworkError ? t('common.connectionError') : t('invitation.notFound')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isNetworkError
                ? t('common.checkConnectionRetry')
                : t('invitation.notFoundDescription')}
            </p>
          </div>

          {isNetworkError ? (
            <Button onClick={() => refetch()} className="h-11 gap-2">
              <RefreshCw className="size-4" />
              {t('common.retry')}
            </Button>
          ) : (
            <Button asChild className="h-11 gap-2">
              <Link href="/dashboard">
                <Languages className="size-4" />
                {t('common.goToDashboard')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Declined state
  if (hasDeclined) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="animate-fade-in-up w-full max-w-md space-y-6 text-center">
          <div className="from-muted/50 to-muted/20 border-border/40 mx-auto flex size-16 items-center justify-center rounded-2xl border bg-linear-to-br">
            <X className="text-muted-foreground size-8" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('invitation.declined')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('invitation.declinedDescription', { projectName: invitation.projectName })}
            </p>
          </div>

          <Button asChild variant="outline" className="h-11 gap-2">
            <Link href="/dashboard">
              <Languages className="size-4" />
              {t('common.goToDashboard')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if logged in user's email matches invitation
  const emailMatches = user && user.email.toLowerCase() === invitation.email.toLowerCase();
  const roleStyle = roleStyles[invitation.role];
  const RoleIcon = roleStyle.icon;

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="animate-fade-in-up w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="from-success/20 to-success/5 border-success/20 mx-auto flex size-16 items-center justify-center rounded-2xl border bg-linear-to-br">
            <PartyPopper className="text-success size-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('invitation.youveBeenInvited')}
          </h1>
          <p className="text-muted-foreground">{t('invitation.joinTeam')}</p>
        </div>

        {/* Invitation Details Card */}
        <div className="island space-y-4 p-6">
          {/* Project Info */}
          <div className="flex items-center gap-4">
            <div className="from-primary/15 to-primary/5 border-primary/10 flex size-12 items-center justify-center rounded-xl border bg-linear-to-br">
              <Folder className="text-primary size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{invitation.projectName}</h2>
              <p className="text-muted-foreground font-mono text-sm">{invitation.projectSlug}</p>
            </div>
          </div>

          <div className="bg-border/60 h-px" />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
                {t('invitation.role')}
              </p>
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold tracking-widest uppercase',
                  roleStyle.bg,
                  roleStyle.text,
                  roleStyle.border
                )}
              >
                <RoleIcon className="size-3" />
                {invitation.role}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
                {t('invitation.invitedBy')}
              </p>
              <p className="text-sm font-medium">
                {invitation.inviterName || t('invitation.teamMember')}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
                {t('invitation.expires')}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="text-muted-foreground size-3.5" />
                {format(new Date(invitation.expiresAt), 'MMMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* Auth Status / Actions */}
        {!user ? (
          // Not logged in
          <>
            <div className="bg-info/5 border-info/20 flex items-start gap-3 rounded-xl border p-4">
              <div className="bg-info/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                <LogIn className="text-info size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('invitation.signInToAccept')}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t('invitation.signInDescription')}{' '}
                  <span className="text-foreground font-mono">{invitation.email}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild className="h-11 gap-2">
                <Link href={`/login?redirect=/invite/${token}`}>
                  <LogIn className="size-4" />
                  {t('auth.signIn')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 gap-2">
                <Link
                  href={`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}
                >
                  <UserPlus className="size-4" />
                  {t('auth.createAccount')}
                </Link>
              </Button>
            </div>
          </>
        ) : emailMatches ? (
          // Logged in with matching email
          <>
            <div className="bg-success/5 border-success/20 flex items-start gap-3 rounded-xl border p-4">
              <div className="bg-success/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Check className="text-success size-4" />
              </div>
              <div>
                <p className="text-success text-sm font-medium">{t('invitation.readyToJoin')}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t('invitation.loggedInAs')}{' '}
                  <span className="text-foreground font-mono">{user.email}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setHasDeclined(true)}
              >
                {t('invitation.decline')}
              </Button>
              <Button
                className="h-11 flex-1 gap-2"
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {t('invitation.accept')}
              </Button>
            </div>
          </>
        ) : (
          // Logged in with different email
          <>
            <div className="bg-warning/5 border-warning/20 flex items-start gap-3 rounded-xl border p-4">
              <div className="bg-warning/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                <AlertTriangle className="text-warning size-4" />
              </div>
              <div>
                <p className="text-warning text-sm font-medium">{t('invitation.wrongAccount')}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t('invitation.wrongAccountDescription', {
                    invitedEmail: invitation.email,
                    currentEmail: user.email,
                  })}
                </p>
              </div>
            </div>

            <Button asChild className="h-11 w-full gap-2">
              <Link href={`/login?redirect=/invite/${token}`}>
                <LogIn className="size-4" />
                {t('invitation.logInAs', { email: invitation.email })}
              </Link>
            </Button>
          </>
        )}

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            {t('common.returnToDashboard')}
          </Link>
        </p>
      </div>
    </div>
  );
}
