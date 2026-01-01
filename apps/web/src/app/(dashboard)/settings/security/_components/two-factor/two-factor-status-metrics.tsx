'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { KeyRound, Monitor, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwoFactorStatusMetricsProps {
  backupCodesRemaining: number;
  trustedDevicesCount: number;
}

export function TwoFactorStatusMetrics({
  backupCodesRemaining,
  trustedDevicesCount,
}: TwoFactorStatusMetricsProps) {
  const { t } = useTranslation();
  const isLowCodes = backupCodesRemaining <= 2;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Backup Codes Metric */}
      <div className="p-5 rounded-2xl bg-linear-to-br from-muted/40 to-muted/20 border border-border/40">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('security.twoFactor.backupCodes')}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-3xl font-bold tabular-nums tracking-tight',
              isLowCodes ? 'text-warning' : 'text-foreground'
            )}
          >
            {backupCodesRemaining}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('security.twoFactor.remaining')}
          </span>
        </div>
        {isLowCodes && (
          <p className="text-xs text-warning mt-3 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-3.5" />
            {t('security.twoFactor.considerRegenerating')}
          </p>
        )}
      </div>

      {/* Trusted Devices Metric */}
      <div className="p-5 rounded-2xl bg-linear-to-br from-muted/40 to-muted/20 border border-border/40">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('security.twoFactor.trustedDevices')}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {trustedDevicesCount}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('security.twoFactor.devices')}
          </span>
        </div>
      </div>
    </div>
  );
}
