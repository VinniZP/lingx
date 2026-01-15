'use client';

import { roleStyles } from '@/app/(protected)/(project)/projects/[projectId]/settings/members/_components/role-selector';
import { Button } from '@/components/ui/button';
import { invitationApi, MemberApiError } from '@/lib/api/members';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Calendar,
  Folder,
  Languages,
  Loader2,
  PartyPopper,
  RefreshCw,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { AuthSection } from './_components/auth-section';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function AcceptInvitationPage({ params }: PageProps) {
  const { token } = use(params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [hasDeclined, setHasDeclined] = useState(false);
  const { t } = useTranslation();

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

  const handleAccept = useCallback(() => {
    if (!invitation) return;

    const { projectName, projectSlug } = invitation;

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
      <PageContainer>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{t('invitation.loading')}</p>
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (error || !invitation) {
    const isNetworkError = error && !(error instanceof MemberApiError);

    return (
      <PageContainer>
        <div className="animate-fade-in-up w-full max-w-md space-y-6 text-center">
          <StatusIcon
            variant={isNetworkError ? 'warning' : 'destructive'}
            icon={isNetworkError ? WifiOff : XCircle}
          />
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
            <DashboardLink />
          )}
        </div>
      </PageContainer>
    );
  }

  // Declined state
  if (hasDeclined) {
    return (
      <PageContainer>
        <div className="animate-fade-in-up w-full max-w-md space-y-6 text-center">
          <StatusIcon variant="muted" icon={X} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('invitation.declined')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('invitation.declinedDescription', { projectName: invitation.projectName })}
            </p>
          </div>
          <DashboardLink variant="outline" />
        </div>
      </PageContainer>
    );
  }

  const emailMatches = user?.email.toLowerCase() === invitation.email.toLowerCase();
  const roleStyle = roleStyles[invitation.role];
  const RoleIcon = roleStyle.icon;

  return (
    <PageContainer>
      <div className="animate-fade-in-up w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-3 text-center">
          <StatusIcon variant="success" icon={PartyPopper} />
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('invitation.youveBeenInvited')}
          </h1>
          <p className="text-muted-foreground">{t('invitation.joinTeam')}</p>
        </div>

        {/* Invitation Details Card */}
        <div className="island space-y-4 p-6">
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

        {/* Auth Section */}
        <AuthSection
          token={token}
          invitationEmail={invitation.email}
          user={user}
          emailMatches={emailMatches}
          isPending={acceptMutation.isPending}
          onAccept={handleAccept}
          onDecline={() => setHasDeclined(true)}
        />

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            {t('common.returnToDashboard')}
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}

// Shared layout wrapper
function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      {children}
    </div>
  );
}

// Reusable status icon
type StatusVariant = 'success' | 'warning' | 'destructive' | 'muted';

function StatusIcon({
  variant,
  icon: Icon,
}: {
  variant: StatusVariant;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const variantStyles: Record<StatusVariant, string> = {
    success: 'from-success/20 to-success/5 border-success/20 text-success',
    warning: 'from-warning/20 to-warning/5 border-warning/20 text-warning',
    destructive: 'from-destructive/20 to-destructive/5 border-destructive/20 text-destructive',
    muted: 'from-muted/50 to-muted/20 border-border/40 text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'mx-auto flex size-16 items-center justify-center rounded-2xl border bg-linear-to-br',
        variantStyles[variant]
      )}
    >
      <Icon className="size-8" />
    </div>
  );
}

// Dashboard link button
function DashboardLink({ variant = 'default' }: { variant?: 'default' | 'outline' }) {
  const { t } = useTranslation();
  return (
    <Button asChild variant={variant} className="h-11 gap-2">
      <Link href="/dashboard">
        <Languages className="size-4" />
        {t('common.goToDashboard')}
      </Link>
    </Button>
  );
}
