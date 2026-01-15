'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { AlertTriangle, KeyRound, Monitor } from 'lucide-react';

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
      <div className="from-muted/40 to-muted/20 border-border/40 rounded-2xl border bg-linear-to-br p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t('security.twoFactor.backupCodes')}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-3xl font-bold tracking-tight tabular-nums',
              isLowCodes ? 'text-warning' : 'text-foreground'
            )}
          >
            {backupCodesRemaining}
          </span>
          <span className="text-muted-foreground text-sm">{t('security.twoFactor.remaining')}</span>
        </div>
        {isLowCodes && (
          <p className="text-warning mt-3 flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle className="size-3.5" />
            {t('security.twoFactor.considerRegenerating')}
          </p>
        )}
      </div>

      {/* Trusted Devices Metric */}
      <div className="from-muted/40 to-muted/20 border-border/40 rounded-2xl border bg-linear-to-br p-5">
        <div className="mb-3 flex items-center gap-2">
          <Monitor className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t('security.twoFactor.trustedDevices')}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums">
            {trustedDevicesCount}
          </span>
          <span className="text-muted-foreground text-sm">{t('security.twoFactor.devices')}</span>
        </div>
      </div>
    </div>
  );
}
