'use client';

import { Button } from '@/components/ui/button';
import { useRelativeTime } from '@/hooks/use-relative-time';
import type { Session } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Clock, Globe, Loader2, Monitor, Smartphone, XCircle } from 'lucide-react';

interface SessionRowProps {
  session: Session;
  onRevoke: () => void;
  isRevoking: boolean;
  isCurrent?: boolean;
}

function isMobileDevice(deviceInfo?: string | null): boolean {
  if (!deviceInfo) return false;
  const lower = deviceInfo.toLowerCase();
  return lower.includes('mobile') || lower.includes('ios') || lower.includes('android');
}

export function SessionRow({ session, onRevoke, isRevoking, isCurrent = false }: SessionRowProps) {
  const { t } = useTranslation();
  const { formatRelativeTime } = useRelativeTime();

  const isMobile = isMobileDevice(session.deviceInfo);
  const DeviceIcon = isMobile ? Smartphone : Monitor;
  const lastActive = formatRelativeTime(new Date(session.lastActive));

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-xl border',
          isCurrent ? 'bg-success/10 border-success/20' : 'bg-muted/30 border-border/40'
        )}
      >
        <DeviceIcon
          className={cn('size-5', isCurrent ? 'text-success' : 'text-muted-foreground')}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2.5">
          <span className={cn('truncate text-sm font-medium', isCurrent && 'text-success')}>
            {session.deviceInfo || t('security.activeSessions.unknownDevice')}
          </span>
          {isCurrent && (
            <span className="bg-success/10 text-success border-success/20 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
              {t('security.activeSessions.current')}
            </span>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {session.ipAddress && (
            <>
              <Globe className="size-3" />
              <span>{session.ipAddress}</span>
              <span className="text-border/60">•</span>
            </>
          )}
          <Clock className="size-3" />
          <span>{isCurrent ? t('security.activeSessions.activeNow') : lastActive}</span>
        </div>
      </div>

      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-10 shrink-0 rounded-xl p-0"
        >
          {isRevoking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" />
          )}
          <span className="sr-only">{t('security.activeSessions.revokeSession')}</span>
        </Button>
      )}
    </div>
  );
}
