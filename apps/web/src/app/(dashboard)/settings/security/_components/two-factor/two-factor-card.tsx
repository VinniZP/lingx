'use client';

import { useState } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { TwoFactorSetup } from '@/components/security/two-factor-setup';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Monitor,
  Smartphone,
  RefreshCw,
  Trash2,
  Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTotpStatus } from './use-two-factor';
import { DisableTwoFactorDialog } from './disable-two-factor-dialog';
import { RegenerateCodesDialog } from './regenerate-codes-dialog';
import { NewBackupCodesDialog } from './new-backup-codes-dialog';
import { TwoFactorStatusMetrics } from './two-factor-status-metrics';

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
      <div className="island p-10 border-0 shadow-lg shadow-black/2">
        <div className="flex items-center gap-5 animate-pulse">
          <div className="size-16 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-72 bg-muted rounded-lg" />
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
            'px-8 py-5 flex items-center gap-5 border-b',
            status?.enabled
              ? 'bg-linear-to-r from-success/12 via-success/6 to-transparent border-success/20'
              : 'bg-linear-to-r from-warning/12 via-warning/6 to-transparent border-warning/20'
          )}
        >
          <div
            className={cn(
              'size-14 rounded-2xl flex items-center justify-center shadow-sm',
              status?.enabled
                ? 'bg-linear-to-br from-success/20 to-success/5 border border-success/20'
                : 'bg-linear-to-br from-warning/20 to-warning/5 border border-warning/20'
            )}
          >
            {status?.enabled ? (
              <ShieldCheck className="size-7 text-success" />
            ) : (
              <ShieldAlert className="size-7 text-warning" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-xl tracking-tight">
                {t('security.twoFactor.title')}
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full',
                  status?.enabled
                    ? 'bg-success/15 text-success border border-success/20'
                    : 'bg-warning/15 text-warning border border-warning/20'
                )}
              >
                {status?.enabled
                  ? t('security.twoFactor.active')
                  : t('security.twoFactor.inactive')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
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
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRegenerateDialogOpen(true)}
                  className="flex-1 gap-2.5 h-12 rounded-xl border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                >
                  <RefreshCw className="size-4" />
                  {t('security.twoFactor.regenerateCodes')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDisableDialogOpen(true)}
                  className="flex-1 gap-2.5 h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
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
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-border/50 transition-colors"
                  >
                    <div className="size-10 rounded-xl bg-linear-to-br from-primary/10 to-transparent flex items-center justify-center border border-primary/10">
                      <item.icon className={cn('size-5', item.color)} />
                    </div>
                    <span className="text-sm font-medium text-foreground/80">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setSetupOpen(true)}
                className="w-full gap-3 h-14 text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
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

      <DisableTwoFactorDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
      />

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
