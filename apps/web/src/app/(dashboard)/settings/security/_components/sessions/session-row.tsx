'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import type { Session } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Globe, Clock, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRelativeTime } from '@/hooks/use-relative-time';

interface SessionRowProps {
  session: Session;
  onRevoke: () => void;
  isRevoking: boolean;
  isCurrent?: boolean;
}

function isMobileDevice(deviceInfo?: string | null): boolean {
  if (!deviceInfo) return false;
  const lower = deviceInfo.toLowerCase();
  return (
    lower.includes('mobile') ||
    lower.includes('ios') ||
    lower.includes('android')
  );
}

export function SessionRow({
  session,
  onRevoke,
  isRevoking,
  isCurrent = false,
}: SessionRowProps) {
  const { t } = useTranslation();
  const { formatRelativeTime } = useRelativeTime();

  const isMobile = isMobileDevice(session.deviceInfo);
  const DeviceIcon = isMobile ? Smartphone : Monitor;
  const lastActive = formatRelativeTime(new Date(session.lastActive));

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'size-12 rounded-xl flex items-center justify-center shrink-0 border',
          isCurrent
            ? 'bg-success/10 border-success/20'
            : 'bg-muted/30 border-border/40'
        )}
      >
        <DeviceIcon
          className={cn(
            'size-5',
            isCurrent ? 'text-success' : 'text-muted-foreground'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1">
          <span
            className={cn(
              'font-medium text-sm truncate',
              isCurrent && 'text-success'
            )}
          >
            {session.deviceInfo || t('security.activeSessions.unknownDevice')}
          </span>
          {isCurrent && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
              {t('security.activeSessions.current')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {session.ipAddress && (
            <>
              <Globe className="size-3" />
              <span>{session.ipAddress}</span>
              <span className="text-border/60">•</span>
            </>
          )}
          <Clock className="size-3" />
          <span>
            {isCurrent ? t('security.activeSessions.activeNow') : lastActive}
          </span>
        </div>
      </div>

      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          className="size-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-xl"
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
