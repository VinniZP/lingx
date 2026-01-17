'use client';

import { ApiKeyDialog } from '@/components/api-key-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiKeyApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Clock, Key, Plus, RotateCcw, Shield, ShieldCheck, Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  SettingsBackdrop,
  SettingsBackLink,
  SettingsLoadingState,
  SettingsPageHeader,
  SettingsResourceLink,
  SettingsSectionHeader,
  SettingsTipCard,
} from '../_components';
import { ApiKeyRow, NewKeyAlert, RevokedKeyRow } from './_components';

export default function ApiKeysPage() {
  const { t } = useTranslation();
  const { isManager, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.push('/projects');
    }
  }, [isManager, authLoading, router]);

  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await apiKeyApi.list();
      return response.apiKeys;
    },
    enabled: isManager,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiKeyApi.create(name);
      return response;
    },
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success(t('apiKeys.createdSuccess'), {
        description: t('apiKeys.copyWarning'),
      });
    },
    onError: (error: ApiError) => {
      if (!error.fieldErrors?.length) {
        toast.error(t('apiKeys.createFailed'), {
          description: error.message,
        });
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiKeyApi.revoke(keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success(t('apiKeys.revokedSuccess'), {
        description: t('apiKeys.revokedDescription'),
      });
    },
    onError: (error: ApiError) => {
      toast.error(t('apiKeys.revokeFailed'), {
        description: error.message,
      });
    },
  });

  const handleCreate = async (name: string) => {
    await createMutation.mutateAsync(name);
    setShowCreateDialog(false);
  };

  if (authLoading) {
    return (
      <SettingsLoadingState
        icon={Key}
        title={t('apiKeys.loading')}
        subtitle={t('common.pleaseWait')}
        accentColor="warm"
      />
    );
  }

  if (!isManager) {
    return null;
  }

  const apiKeys = apiKeysData ?? [];
  const activeKeys = apiKeys.filter((k) => !k.revoked);
  const revokedKeys = apiKeys.filter((k) => k.revoked);

  const statsWidget = (
    <div className="from-muted/50 to-muted/20 border-border/50 min-w-45 shrink-0 rounded-2xl border bg-linear-to-br p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('apiKeys.stats.active')}</span>
          <span
            className={cn(
              'text-2xl font-bold tracking-tight',
              activeKeys.length > 0 ? 'text-success' : 'text-foreground'
            )}
          >
            {isLoading ? '-' : activeKeys.length}
          </span>
        </div>
        <div className="border-border/50 flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-sm">{t('apiKeys.stats.total')}</span>
          <span className="text-lg font-semibold">{isLoading ? '-' : apiKeys.length}</span>
        </div>
      </div>
    </div>
  );

  const headerAction = (
    <Button
      onClick={() => setShowCreateDialog(true)}
      className="shadow-primary/15 h-12 gap-2.5 rounded-xl px-6 shadow-lg"
      data-testid="generate-key-button"
    >
      <Plus className="size-5" />
      {t('apiKeys.generateNew')}
    </Button>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-16">
      <SettingsBackdrop accentColor="warm" />
      <SettingsBackLink />

      <SettingsPageHeader
        icon={Key}
        title={t('apiKeys.pageTitle')}
        description={t('apiKeys.pageDescription')}
        accentColor="warm"
        widget={statsWidget}
        actions={headerAction}
      />

      {newKey && <NewKeyAlert apiKey={newKey} onDismiss={() => setNewKey(null)} />}

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-8 lg:col-span-7 xl:col-span-8">
          {/* Active Keys */}
          <section className="animate-fade-in-up stagger-2">
            <SettingsSectionHeader
              icon={ShieldCheck}
              title={t('apiKeys.activeKeys')}
              iconVariant="success"
              trailing={
                <span className="text-muted-foreground text-xs font-medium">
                  {activeKeys.length}{' '}
                  {activeKeys.length === 1 ? t('apiKeys.key') : t('apiKeys.keys')}
                </span>
              }
            />

            <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
              {isLoading ? (
                <div className="space-y-4 p-8">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : activeKeys.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="relative mx-auto mb-6">
                    <div className="bg-muted/50 absolute inset-0 scale-150 rounded-3xl blur-xl" />
                    <div className="from-muted/60 to-muted/20 border-border/40 relative flex size-20 items-center justify-center rounded-3xl border bg-linear-to-br">
                      <Key className="text-muted-foreground/60 size-10" />
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6 text-base">
                    {t('apiKeys.noActiveKeys')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                    className="h-12 gap-2 rounded-xl px-6"
                  >
                    <Plus className="size-4" />
                    {t('apiKeys.generateFirst')}
                  </Button>
                </div>
              ) : (
                <div className="divide-border/40 divide-y">
                  {activeKeys.map((key) => (
                    <ApiKeyRow
                      key={key.id}
                      apiKey={key}
                      onRevoke={() => revokeMutation.mutate(key.id)}
                      isRevoking={revokeMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Revoked Keys */}
          {revokedKeys.length > 0 && (
            <section className="animate-fade-in-up stagger-3">
              <SettingsSectionHeader
                icon={Key}
                title={t('apiKeys.revokedKeys')}
                iconVariant="muted"
                trailing={
                  <span className="text-muted-foreground text-xs font-medium">
                    {revokedKeys.length}{' '}
                    {revokedKeys.length === 1 ? t('apiKeys.key') : t('apiKeys.keys')}
                  </span>
                }
              />

              <div className="island overflow-hidden border-0 opacity-70 shadow-lg shadow-black/2">
                <div className="divide-border/40 divide-y">
                  {revokedKeys.map((key) => (
                    <RevokedKeyRow key={key.id} apiKey={key} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8 lg:col-span-5 xl:col-span-4">
          <section className="animate-fade-in-up stagger-4">
            <SettingsSectionHeader
              icon={Shield}
              title={t('apiKeys.securityTips.title')}
              iconVariant="warning"
            />
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
              <div className="divide-border/40 divide-y">
                <SettingsTipCard
                  icon={Shield}
                  status="info"
                  title={t('apiKeys.securityTips.keepSecret')}
                  description={t('apiKeys.securityTips.keepSecretDesc')}
                />
                <SettingsTipCard
                  icon={RotateCcw}
                  status="warning"
                  title={t('apiKeys.securityTips.rotateRegularly')}
                  description={t('apiKeys.securityTips.rotateRegularlyDesc')}
                />
                <SettingsTipCard
                  icon={Clock}
                  status="good"
                  title={t('apiKeys.securityTips.monitorUsage')}
                  description={t('apiKeys.securityTips.monitorUsageDesc')}
                />
              </div>
            </div>
          </section>

          <section className="animate-fade-in-up stagger-5">
            <SettingsSectionHeader
              icon={BookOpen}
              title={t('apiKeys.docs.title')}
              iconVariant="primary"
            />
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
              <div className="divide-border/40 divide-y">
                <SettingsResourceLink
                  href="https://docs.lingx.dev/cli"
                  icon={Terminal}
                  title={t('apiKeys.docs.cliSetup')}
                  description={t('apiKeys.docs.cliSetupDesc')}
                />
                <SettingsResourceLink
                  href="https://docs.lingx.dev/sdk"
                  icon={BookOpen}
                  title={t('apiKeys.docs.sdkIntegration')}
                  description={t('apiKeys.docs.sdkIntegrationDesc')}
                />
                <SettingsResourceLink
                  href="https://docs.lingx.dev/api"
                  icon={Key}
                  title={t('apiKeys.docs.apiReference')}
                  description={t('apiKeys.docs.apiReferenceDesc')}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      <ApiKeyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        error={createMutation.error as ApiError | null}
      />
    </div>
  );
}
