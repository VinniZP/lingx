'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { CheckCircle2, Fingerprint, Monitor, Plus, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { AddPasskeyDialog } from './add-passkey-dialog';
import { DeletePasskeyDialog } from './delete-passkey-dialog';
import { GoPasswordlessDialog } from './go-passwordless-dialog';
import { PasskeyRow } from './passkey-row';
import { usePasskeyCredentials, usePasskeyStatus, usePasskeySupport } from './use-passkeys';

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
      <div className="island border-0 p-10 text-center shadow-lg shadow-black/2">
        <div className="bg-muted/50 border-border/50 mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border">
          <Fingerprint className="text-muted-foreground/50 size-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t('security.passkeys.notSupported')}</h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {t('security.passkeys.notSupportedDescription')}
        </p>
      </div>
    );
  }

  // Loading state
  if (statusLoading || credentialsLoading) {
    return (
      <div className="island border-0 p-10 shadow-lg shadow-black/2">
        <div className="flex animate-pulse items-center gap-5">
          <div className="bg-muted size-16 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="bg-muted h-6 w-40 rounded-lg" />
            <div className="bg-muted h-4 w-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const features = [
    { icon: Fingerprint, text: t('security.passkeys.features.biometrics'), color: 'text-primary' },
    {
      icon: ShieldCheck,
      text: t('security.passkeys.features.phishingResistant'),
      color: 'text-success',
    },
    { icon: Monitor, text: t('security.passkeys.features.synced'), color: 'text-info' },
  ];

  return (
    <>
      <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-5 border-b px-8 py-5',
            status?.hasPasskeys
              ? 'from-primary/12 via-primary/6 border-primary/20 bg-linear-to-r to-transparent'
              : 'from-muted/40 border-border/40 bg-linear-to-r to-transparent'
          )}
        >
          <div
            className={cn(
              'flex size-14 items-center justify-center rounded-2xl shadow-sm',
              status?.hasPasskeys
                ? 'from-primary/20 to-primary/5 border-primary/20 border bg-linear-to-br'
                : 'bg-muted/50 border-border/50 border'
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
            <div className="mb-1 flex items-center gap-3">
              <span className="text-xl font-semibold tracking-tight">
                {t('security.passkeys.title')}
              </span>
              {status?.isPasswordless && (
                <span className="bg-success/15 text-success border-success/20 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
                  Passwordless
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {status?.hasPasskeys
                ? `${status.credentialsCount} passkey${status.credentialsCount !== 1 ? 's' : ''} registered`
                : t('security.passkeys.description')}
            </p>
          </div>
        </div>

        <div className="space-y-6 p-8">
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="shadow-primary/15 h-12 flex-1 gap-2.5 rounded-xl shadow-lg"
            >
              <Plus className="size-4" />
              {t('security.passkeys.addPasskey')}
            </Button>

            {status?.canGoPasswordless && !status.isPasswordless && (
              <Button
                variant="outline"
                onClick={() => setGoPasswordlessDialogOpen(true)}
                className="border-border/60 hover:border-primary/40 h-12 flex-1 gap-2.5 rounded-xl"
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
                  className="bg-muted/20 border-border/30 flex items-center gap-4 rounded-xl border p-4"
                >
                  <div className="from-primary/10 border-primary/10 flex size-10 items-center justify-center rounded-xl border bg-linear-to-br to-transparent">
                    <item.icon className={cn('size-5', item.color)} />
                  </div>
                  <span className="text-foreground/80 text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Passwordless enabled banner */}
          {status?.isPasswordless && (
            <div className="bg-success/5 border-success/20 flex items-start gap-4 rounded-2xl border p-5">
              <div className="bg-success/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
                <CheckCircle2 className="text-success size-5" />
              </div>
              <div>
                <p className="text-success mb-1 font-medium">
                  {t('security.passkeys.passwordlessEnabled.title')}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t('security.passkeys.passwordlessEnabled.description')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddPasskeyDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

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
