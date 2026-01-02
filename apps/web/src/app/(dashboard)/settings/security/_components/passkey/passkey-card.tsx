'use client';

import { useState } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import {
  Fingerprint,
  Monitor,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePasskeySupport,
  usePasskeyStatus,
  usePasskeyCredentials,
} from './use-passkeys';
import { AddPasskeyDialog } from './add-passkey-dialog';
import { DeletePasskeyDialog } from './delete-passkey-dialog';
import { GoPasswordlessDialog } from './go-passwordless-dialog';
import { PasskeyRow } from './passkey-row';

export function PasskeyCard() {
  const { t } = useTranslation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteCredentialId, setDeleteCredentialId] = useState<string | null>(null);
  const [goPasswordlessDialogOpen, setGoPasswordlessDialogOpen] = useState(false);

  const supportsPasskey = usePasskeySupport();
  const { data: status, isLoading: statusLoading } = usePasskeyStatus();
  const { credentials, isLoading: credentialsLoading } = usePasskeyCredentials();

  // Not supported state
  if (!supportsPasskey) {
    return (
      <div className="island p-10 text-center border-0 shadow-lg shadow-black/2">
        <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5 border border-border/50">
          <Fingerprint className="size-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-lg mb-2">
          {t('security.passkeys.notSupported')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t('security.passkeys.notSupportedDescription')}
        </p>
      </div>
    );
  }

  // Loading state
  if (statusLoading || credentialsLoading) {
    return (
      <div className="island p-10 border-0 shadow-lg shadow-black/2">
        <div className="flex items-center gap-5 animate-pulse">
          <div className="size-16 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-muted rounded-lg" />
            <div className="h-4 w-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const features = [
    { icon: Fingerprint, text: t('security.passkeys.features.biometrics'), color: 'text-primary' },
    { icon: ShieldCheck, text: t('security.passkeys.features.phishingResistant'), color: 'text-success' },
    { icon: Monitor, text: t('security.passkeys.features.synced'), color: 'text-info' },
  ];

  return (
    <>
      <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
        {/* Header */}
        <div
          className={cn(
            'px-8 py-5 flex items-center gap-5 border-b',
            status?.hasPasskeys
              ? 'bg-linear-to-r from-primary/12 via-primary/6 to-transparent border-primary/20'
              : 'bg-linear-to-r from-muted/40 to-transparent border-border/40'
          )}
        >
          <div
            className={cn(
              'size-14 rounded-2xl flex items-center justify-center shadow-sm',
              status?.hasPasskeys
                ? 'bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20'
                : 'bg-muted/50 border border-border/50'
            )}
          >
            <Fingerprint
              className={cn(
                'size-7',
                status?.hasPasskeys ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-xl tracking-tight">
                {t('security.passkeys.title')}
              </span>
              {status?.isPasswordless && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/20">
                  Passwordless
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {status?.hasPasskeys
                ? `${status.credentialsCount} passkey${status.credentialsCount !== 1 ? 's' : ''} registered`
                : t('security.passkeys.description')}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Passkey list */}
          {credentials.length > 0 && (
            <div className="space-y-3">
              {credentials.map((credential) => (
                <PasskeyRow
                  key={credential.id}
                  credential={credential}
                  onDelete={setDeleteCredentialId}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="flex-1 gap-2.5 h-12 rounded-xl shadow-lg shadow-primary/15"
            >
              <Plus className="size-4" />
              {t('security.passkeys.addPasskey')}
            </Button>

            {status?.canGoPasswordless && !status.isPasswordless && (
              <Button
                variant="outline"
                onClick={() => setGoPasswordlessDialogOpen(true)}
                className="flex-1 gap-2.5 h-12 rounded-xl border-border/60 hover:border-primary/40"
              >
                <ShieldOff className="size-4" />
                {t('security.passkeys.goPasswordless')}
              </Button>
            )}
          </div>

          {/* Features for empty state */}
          {!status?.hasPasskeys && (
            <div className="grid gap-4 pt-2">
              {features.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30"
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
          )}

          {/* Passwordless enabled banner */}
          {status?.isPasswordless && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-success/5 border border-success/20">
              <div className="size-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-success mb-1">
                  {t('security.passkeys.passwordlessEnabled.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('security.passkeys.passwordlessEnabled.description')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddPasskeyDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <DeletePasskeyDialog
        credentialId={deleteCredentialId}
        onOpenChange={() => setDeleteCredentialId(null)}
      />

      <GoPasswordlessDialog
        open={goPasswordlessDialogOpen}
        onOpenChange={setGoPasswordlessDialogOpen}
        credentialsCount={status?.credentialsCount ?? 0}
      />
    </>
  );
}
