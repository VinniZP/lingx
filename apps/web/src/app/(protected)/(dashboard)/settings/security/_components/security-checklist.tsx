'use client';

import { totpApi, webauthnApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Fingerprint, Lock, Monitor, Shield, Zap } from 'lucide-react';
import { SettingsQuickTip } from '../../_components';

export function SecurityChecklist() {
  const { t } = useTranslation();
  const supportsPasskey = typeof window !== 'undefined' && browserSupportsWebAuthn();

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
      <div className="from-muted/30 border-border/40 border-b bg-linear-to-r to-transparent px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t('security.completeCount', {
              current: completedCount,
              total: checks.length,
            })}
          </span>
          <div className="bg-muted/50 h-1.5 w-24 overflow-hidden rounded-full">
            <div
              className="bg-success h-full rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / checks.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="divide-border/40 divide-y">
        {checks.map((check, i) => (
          <div key={i} className="hover:bg-muted/10 flex items-start gap-4 p-5 transition-colors">
            <div
              className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border',
                check.done ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20'
              )}
            >
              {check.done ? (
                <CheckCircle2 className="text-success size-4" />
              ) : (
                <AlertTriangle className="text-warning size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium', check.done ? 'text-foreground' : 'text-warning')}>
                {check.label}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">{check.tip}</p>
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
