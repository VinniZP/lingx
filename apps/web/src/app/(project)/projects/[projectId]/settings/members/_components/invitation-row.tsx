'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectInvitationResponse } from '@lingx/shared';
import { differenceInDays } from 'date-fns';
import { Clock, Loader2, Mail, X } from 'lucide-react';
import { roleStyles } from './role-selector';

interface InvitationRowProps {
  invitation: ProjectInvitationResponse;
  onRevoke: () => void;
  isRevoking?: boolean;
}

function getExpiryStatus(daysUntilExpiry: number): 'expired' | 'expiring' | 'normal' {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 2) return 'expiring';
  return 'normal';
}

export function InvitationRow({ invitation, onRevoke, isRevoking }: InvitationRowProps) {
  const { t } = useTranslation();
  const daysUntilExpiry = differenceInDays(new Date(invitation.expiresAt), new Date());
  const expiryStatus = getExpiryStatus(daysUntilExpiry);

  const style = roleStyles[invitation.role];
  const RoleIcon = style.icon;

  return (
    <div className="group hover:bg-muted/20 flex items-center gap-5 p-5 transition-colors">
      {/* Mail Icon */}
      <div className="from-warning/15 to-warning/5 border-warning/20 flex size-12 items-center justify-center rounded-xl border bg-linear-to-br">
        <Mail className="text-warning size-5" />
      </div>

      {/* Email + Inviter */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{invitation.email}</p>
        <p className="text-muted-foreground text-sm">
          {t('members.invitedBy', {
            name: invitation.invitedBy.name || invitation.invitedBy.email,
          })}
        </p>
      </div>

      {/* Role Badge */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase',
          style.bg,
          style.text,
          style.border
        )}
      >
        <RoleIcon className="size-3" />
        {invitation.role}
      </div>

      {/* Expiry */}
      <div
        className={cn(
          'flex min-w-24 items-center gap-1.5 text-xs',
          expiryStatus === 'expired' && 'text-destructive font-medium',
          expiryStatus === 'expiring' && 'text-warning font-medium',
          expiryStatus === 'normal' && 'text-muted-foreground'
        )}
      >
        {expiryStatus !== 'normal' && <Clock className="size-3.5" />}
        {expiryStatus === 'expired'
          ? t('members.expired')
          : t('members.expiresIn', { days: daysUntilExpiry })}
      </div>

      {/* Revoke Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRevoke}
        disabled={isRevoking}
        className={cn(
          'text-muted-foreground size-10 rounded-xl',
          'hover:text-destructive hover:bg-destructive/10',
          'opacity-0 transition-opacity group-hover:opacity-100'
        )}
      >
        {isRevoking ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      </Button>
    </div>
  );
}
