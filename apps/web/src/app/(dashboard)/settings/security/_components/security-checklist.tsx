'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { useQuery } from '@tanstack/react-query';
import { totpApi, webauthnApi } from '@/lib/api';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import {
  Shield,
  Lock,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsQuickTip } from '../../_components';

export function SecurityChecklist() {
  const { t } = useTranslation();
  const supportsPasskey =
    typeof window !== 'undefined' && browserSupportsWebAuthn();

  const { data: totpStatus } = useQuery({
    queryKey: ['totp-status'],
    queryFn: () => totpApi.getStatus(),
  });

  const { data: webauthnStatus } = useQuery({
    queryKey: ['webauthn-status'],
    queryFn: () => webauthnApi.getStatus(),
    enabled: supportsPasskey,
  });

  const checks = [
    {
      label: t('security.checklistItems.passkeys'),
      done: webauthnStatus?.hasPasskeys ?? false,
      tip: t('security.checklistItems.passkeysDesc'),
      icon: Fingerprint,
    },
    {
      label: t('security.twoFactor.title'),
      done: totpStatus?.enabled ?? false,
      tip: t('security.twoFactor.inactiveDescription'),
      icon: Shield,
    },
    {
      label: t('settings.tips.strongPassword'),
      done: true,
      tip: t('settings.tips.strongPasswordDesc'),
      icon: Lock,
    },
    {
      label: t('security.activeSessions.title'),
      done: true,
      tip: 'Check for unfamiliar devices',
      icon: Monitor,
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;

  return (
    <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
      {/* Progress header */}
      <div className="px-5 py-4 bg-linear-to-r from-muted/30 to-transparent border-b border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('security.completeCount', {
              current: completedCount,
              total: checks.length,
            })}
          </span>
          <div className="w-24 h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / checks.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {checks.map((check, i) => (
          <div
            key={i}
            className="p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors"
          >
            <div
              className={cn(
                'size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border',
                check.done
                  ? 'bg-success/10 border-success/20'
                  : 'bg-warning/10 border-warning/20'
              )}
            >
              {check.done ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <AlertTriangle className="size-4 text-warning" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'font-medium',
                  check.done ? 'text-foreground' : 'text-warning'
                )}
              >
                {check.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {check.tip}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecurityTips() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <SettingsQuickTip
        icon={Zap}
        title={t('security.tips.quickTip')}
        description={t('security.tips.enableBoth')}
        variant="primary"
      />
    </div>
  );
}
