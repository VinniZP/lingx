'use client';

import { TwoFactorSetup } from '@/components/security/two-factor-setup';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import {
  Fingerprint,
  KeyRound,
  Monitor,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { DisableTwoFactorDialog } from './disable-two-factor-dialog';
import { NewBackupCodesDialog } from './new-backup-codes-dialog';
import { RegenerateCodesDialog } from './regenerate-codes-dialog';
import { TwoFactorStatusMetrics } from './two-factor-status-metrics';
import { useTotpStatus } from './use-two-factor';

export function TwoFactorCard() {
  const { t } = useTranslation();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const { data: status, isLoading, refetch } = useTotpStatus();

  const handleSetupComplete = () => {
    refetch();
  };

  const handleCodesGenerated = (codes: string[]) => {
    setNewBackupCodes(codes);
    setShowBackupCodes(true);
  };

  const handleBackupCodesClose = () => {
    setNewBackupCodes(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="island border-0 p-10 shadow-lg shadow-black/2">
        <div className="flex animate-pulse items-center gap-5">
          <div className="bg-muted size-16 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="bg-muted h-6 w-48 rounded-lg" />
            <div className="bg-muted h-4 w-72 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Smartphone,
      text: t('security.twoFactor.features.totp'),
      color: 'text-primary',
    },
    {
      icon: KeyRound,
      text: t('security.twoFactor.features.backupCodes'),
      color: 'text-success',
    },
    {
      icon: Monitor,
      text: t('security.twoFactor.features.trustDevice'),
      color: 'text-info',
    },
  ];

  return (
    <>
      <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
        {/* Status banner with gradient */}
        <div
          className={cn(
            'flex items-center gap-5 border-b px-8 py-5',
            status?.enabled
              ? 'from-success/12 via-success/6 border-success/20 bg-linear-to-r to-transparent'
              : 'from-warning/12 via-warning/6 border-warning/20 bg-linear-to-r to-transparent'
          )}
        >
          <div
            className={cn(
              'flex size-14 items-center justify-center rounded-2xl shadow-sm',
              status?.enabled
                ? 'from-success/20 to-success/5 border-success/20 border bg-linear-to-br'
                : 'from-warning/20 to-warning/5 border-warning/20 border bg-linear-to-br'
            )}
          >
            {status?.enabled ? (
              <ShieldCheck className="text-success size-7" />
            ) : (
              <ShieldAlert className="text-warning size-7" />
            )}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-3">
              <span className="text-xl font-semibold tracking-tight">
                {t('security.twoFactor.title')}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase',
                  status?.enabled
                    ? 'bg-success/15 text-success border-success/20 border'
                    : 'bg-warning/15 text-warning border-warning/20 border'
                )}
              >
                {status?.enabled
                  ? t('security.twoFactor.active')
                  : t('security.twoFactor.inactive')}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {status?.enabled
                ? t('security.twoFactor.activeDescription')
                : t('security.twoFactor.inactiveDescription')}
            </p>
          </div>
        </div>

        <div className="p-8">
          {status?.enabled ? (
            <div className="space-y-6">
              {/* Status metrics */}
              <TwoFactorStatusMetrics
                backupCodesRemaining={status.backupCodesRemaining}
                trustedDevicesCount={status.trustedDevicesCount}
              />

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setRegenerateDialogOpen(true)}
                  className="border-border/60 hover:border-primary/40 hover:bg-primary/5 h-12 flex-1 gap-2.5 rounded-xl transition-all duration-300"
                >
                  <RefreshCw className="size-4" />
                  {t('security.twoFactor.regenerateCodes')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDisableDialogOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-12 flex-1 gap-2.5 rounded-xl transition-all duration-300"
                >
                  <Trash2 className="size-4" />
                  {t('security.twoFactor.disable')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Benefits list */}
              <div className="grid gap-4">
                {features.map((item, i) => (
                  <div
                    key={i}
                    className="bg-muted/20 border-border/30 hover:border-border/50 flex items-center gap-4 rounded-xl border p-4 transition-colors"
                  >
                    <div className="from-primary/10 border-primary/10 flex size-10 items-center justify-center rounded-xl border bg-linear-to-br to-transparent">
                      <item.icon className={cn('size-5', item.color)} />
                    </div>
                    <span className="text-foreground/80 text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setSetupOpen(true)}
                className="shadow-primary/20 hover:shadow-primary/25 h-14 w-full gap-3 rounded-xl text-base shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <Fingerprint className="size-5" />
                {t('security.twoFactor.enable')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <TwoFactorSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onComplete={handleSetupComplete}
      />

      <DisableTwoFactorDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen} />

      <RegenerateCodesDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        onCodesGenerated={handleCodesGenerated}
      />

      <NewBackupCodesDialog
        open={showBackupCodes}
        onOpenChange={setShowBackupCodes}
        codes={newBackupCodes}
        onClose={handleBackupCodesClose}
      />
    </>
  );
}
