'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { AlertTriangle, Check, Loader2, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface AuthSectionProps {
  token: string;
  invitationEmail: string;
  user: { email: string } | null;
  emailMatches: boolean;
  isPending: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AuthSection({
  token,
  invitationEmail,
  user,
  emailMatches,
  isPending,
  onAccept,
  onDecline,
}: AuthSectionProps) {
  const { t } = useTranslation();

  // Not logged in
  if (!user) {
    return (
      <>
        <div className="bg-info/5 border-info/20 flex items-start gap-3 rounded-xl border p-4">
          <div className="bg-info/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <LogIn className="text-info size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('invitation.signInToAccept')}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('invitation.signInDescription')}{' '}
              <span className="text-foreground font-mono">{invitationEmail}</span>
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
              href={`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitationEmail)}`}
            >
              <UserPlus className="size-4" />
              {t('auth.createAccount')}
            </Link>
          </Button>
        </div>
      </>
    );
  }

  // Logged in with matching email
  if (emailMatches) {
    return (
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
          <Button variant="outline" className="h-11 flex-1" onClick={onDecline}>
            {t('invitation.decline')}
          </Button>
          <Button className="h-11 flex-1 gap-2" onClick={onAccept} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t('invitation.accept')}
          </Button>
        </div>
      </>
    );
  }

  // Logged in with different email
  return (
    <>
      <div className="bg-warning/5 border-warning/20 flex items-start gap-3 rounded-xl border p-4">
        <div className="bg-warning/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <AlertTriangle className="text-warning size-4" />
        </div>
        <div>
          <p className="text-warning text-sm font-medium">{t('invitation.wrongAccount')}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t('invitation.wrongAccountDescription', {
              invitedEmail: invitationEmail,
              currentEmail: user.email,
            })}
          </p>
        </div>
      </div>

      <Button asChild className="h-11 w-full gap-2">
        <Link href={`/login?redirect=/invite/${token}`}>
          <LogIn className="size-4" />
          {t('invitation.logInAs', { email: invitationEmail })}
        </Link>
      </Button>
    </>
  );
}
