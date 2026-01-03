'use client';

import { use, useState } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Trash2,
  Check,
  Loader2,
  Zap,
  ExternalLink,
  BarChart3,
  Key,
  Plug,
  Info,
  Activity,
  DollarSign,
  Database,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMTConfigs,
  useSaveMTConfig,
  useDeleteMTConfig,
  useTestMTConnection,
  useMTUsage,
  getProviderDisplayName,
  formatCost,
  formatCharacterCount,
} from '@/hooks/use-machine-translation';
import type { MTProvider, MTConfig } from '@/lib/api';
import { SettingsSectionHeader } from '@/components/settings';

const configSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  isActive: z.boolean(),
});

type ConfigFormData = z.infer<typeof configSchema>;

// DeepL Logo SVG
function DeepLLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.002 2.25c-5.376 0-9.75 4.374-9.75 9.75s4.374 9.75 9.75 9.75 9.75-4.374 9.75-9.75-4.374-9.75-9.75-9.75zm4.125 14.016l-4.125-2.393-4.125 2.393 1.09-4.71-3.66-3.19 4.82-.42L12.002 3.5l1.875 4.446 4.82.42-3.66 3.19 1.09 4.71z" />
    </svg>
  );
}

// Google Logo SVG
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

interface ProviderCardProps {
  projectId: string;
  provider: MTProvider;
  config?: MTConfig;
  onSave: () => void;
}

function ProviderCard({ projectId, provider, config, onSave }: ProviderCardProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(!config);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const saveMutation = useSaveMTConfig(projectId);
  const deleteMutation = useDeleteMTConfig(projectId);
  const testMutation = useTestMTConnection(projectId);

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    mode: 'onTouched',
    defaultValues: {
      apiKey: '',
      isActive: config?.isActive ?? true,
    },
  });

  const handleSave = async (data: ConfigFormData) => {
    try {
      await saveMutation.mutateAsync({
        provider,
        apiKey: data.apiKey,
        isActive: data.isActive,
      });
      toast.success(t('integrations.toasts.configSaved'), {
        description: t('integrations.toasts.configSavedDescription', { provider: getProviderDisplayName(provider) }),
      });
      setIsEditing(false);
      onSave();
    } catch {
      toast.error(t('integrations.toasts.configSaveFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(provider);
      toast.success(t('integrations.toasts.configRemoved'), {
        description: t('integrations.toasts.configRemovedDescription', { provider: getProviderDisplayName(provider) }),
      });
      setShowDeleteDialog(false);
      form.reset({ apiKey: '', isActive: true });
      setIsEditing(true);
      onSave();
    } catch {
      toast.error(t('integrations.toasts.configRemoveFailed'));
    }
  };

  const handleTest = async () => {
    try {
      const result = await testMutation.mutateAsync(provider);
      if (result.success) {
        toast.success(t('integrations.toasts.connectionSuccessful'), {
          description: t('integrations.toasts.connectionSuccessfulDescription', { provider: getProviderDisplayName(provider) }),
        });
      } else {
        toast.error(t('integrations.toasts.connectionFailed'), {
          description: result.error || t('integrations.toasts.connectionFailedDescription'),
        });
      }
    } catch {
      toast.error(t('integrations.toasts.testFailed'), {
        description: t('integrations.toasts.testFailedDescription'),
      });
    }
  };

  const providerInfo = {
    DEEPL: {
      name: 'DeepL',
      description: 'Neural machine translation with exceptional quality',
      pricing: '$5.49 / 1M chars',
      docsUrl: 'https://www.deepl.com/pro-api',
      logo: DeepLLogo,
      accentColor: 'from-[#0F2B46]/15 to-[#0F2B46]/5',
      borderColor: 'border-[#0F2B46]/10',
      iconColor: 'text-[#0F2B46] dark:text-[#3B82F6]',
      badgeColor: 'bg-[#0F2B46]/10 text-[#0F2B46] dark:bg-blue-500/15 dark:text-blue-400',
    },
    GOOGLE_TRANSLATE: {
      name: 'Google Cloud',
      description: 'Wide language support with Cloud Translation API',
      pricing: '$20 / 1M chars',
      docsUrl: 'https://cloud.google.com/translate/docs',
      logo: GoogleLogo,
      accentColor: 'from-emerald-500/10 to-blue-500/5',
      borderColor: 'border-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  };

  const info = providerInfo[provider];
  const Logo = info.logo;

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all duration-200',
      config
        ? 'border-success/30 bg-success/[0.02]'
        : 'border-border/60 bg-card/50 hover:border-border'
    )}>
      {/* Provider Header */}
      <div className={cn('p-5 bg-linear-to-r', info.accentColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'size-12 rounded-xl flex items-center justify-center bg-background/80 border shadow-sm',
              info.borderColor
            )}>
              <Logo className={cn('size-6', info.iconColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">{info.name}</h3>
                {config && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-success/15 text-success border border-success/20">
                    <Check className="size-3" />
                    {t('integrations.connected')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{info.description}</p>
            </div>
          </div>
          <div className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', info.badgeColor)}>
            {info.pricing}
          </div>
        </div>
      </div>

      {/* Provider Content */}
      <div className="p-5">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Key className="size-3.5" />
                      {t('integrations.apiKey')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={config ? '••••••••••••••••' : t('integrations.enterApiKey')}
                        className="bg-background/50 font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      {t('integrations.apiKeyDescription', { provider: info.name })}{' '}
                      <a
                        href={info.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        {t('integrations.getOneHere')} <ExternalLink className="size-2.5" />
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">{t('integrations.enableProvider')}</FormLabel>
                      <FormDescription className="text-[11px]">
                        {t('integrations.enableProviderDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saveMutation.isPending} size="sm">
                  {saveMutation.isPending && <Loader2 className="size-4 animate-spin mr-1.5" />}
                  {t('integrations.saveConfiguration')}
                </Button>
                {config && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    {t('common.cancel')}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        ) : config ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-background flex items-center justify-center border border-border/60">
                  <Key className="size-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('integrations.apiKey')}</p>
                  <code className="font-mono text-sm font-medium">{config.keyPrefix}</code>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  disabled={testMutation.isPending}
                  className="h-8 px-2.5 text-xs"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="size-3.5 mr-1" />
                      {t('integrations.test')}
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 px-2.5 text-xs">
                  {t('integrations.update')}
                </Button>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dialogs.deleteConfirm.removeIntegration', { name: info.name })}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('dialogs.deleteConfirm.removeIntegrationDescription', { name: info.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteMutation.isPending && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {t('common.remove')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('integrations.connectAccount', { provider: info.name })}
            </p>
            <Button onClick={() => setIsEditing(true)} size="sm" className="gap-2">
              <Plug className="size-4" />
              {t('integrations.configure', { provider: info.name })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function IntegrationsSettingsPage({ params }: PageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();

  const { data: configsData, refetch: refetchConfigs } = useMTConfigs(projectId);
  const { data: usageData } = useMTUsage(projectId);

  const configs = configsData?.configs || [];
  const usage = usageData?.providers || [];

  const getConfig = (provider: MTProvider): MTConfig | undefined =>
    configs.find((c) => c.provider === provider);

  return (
    <div className="space-y-8">
      {/* Translation Providers Section */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Plug}
          title={t('integrations.providers.title')}
          description={t('integrations.providers.subtitle')}
        />

        <div className="space-y-4">
          <ProviderCard
            projectId={projectId}
            provider="DEEPL"
            config={getConfig('DEEPL')}
            onSave={() => refetchConfigs()}
          />
          <ProviderCard
            projectId={projectId}
            provider="GOOGLE_TRANSLATE"
            config={getConfig('GOOGLE_TRANSLATE')}
            onSave={() => refetchConfigs()}
          />
        </div>
      </section>

      {/* Usage Statistics - Always visible */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={BarChart3}
          title={t('integrations.usage.title')}
          description={t('integrations.usage.subtitle')}
          color="emerald"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Always show both provider cards */}
          {(['DEEPL', 'GOOGLE_TRANSLATE'] as MTProvider[]).map((provider) => {
            const stats = usage.find((u) => u.provider === provider);
            const hasData = !!stats;

            return (
              <div
                key={provider}
                className={cn(
                  "rounded-2xl border overflow-hidden",
                  hasData
                    ? "border-border/60 bg-card/50"
                    : "border-dashed border-border/40 bg-muted/10 opacity-60"
                )}
              >
                <div className={cn(
                  "px-5 py-4 border-b flex items-center justify-between",
                  hasData ? "border-border/40" : "border-border/30"
                )}>
                  <span className={cn(
                    "font-medium text-sm",
                    !hasData && "text-muted-foreground"
                  )}>
                    {getProviderDisplayName(provider)}
                  </span>
                  {hasData ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-success/15 text-success">
                      <Activity className="size-3" />
                      {t('integrations.usage.active')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/50 text-muted-foreground">
                      {t('integrations.usage.noData')}
                    </span>
                  )}
                </div>
                <div className="p-5 grid grid-cols-2 gap-5">
                  <div>
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1.5",
                      hasData ? "text-muted-foreground" : "text-muted-foreground/60"
                    )}>
                      <Send className="size-3" />
                      {t('integrations.usage.characters')}
                    </div>
                    <div className={cn(
                      "text-2xl font-semibold tracking-tight",
                      !hasData && "text-muted-foreground/40"
                    )}>
                      {hasData ? formatCharacterCount(stats.currentMonth.characterCount) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1.5",
                      hasData ? "text-muted-foreground" : "text-muted-foreground/60"
                    )}>
                      <Activity className="size-3" />
                      {t('integrations.usage.requests')}
                    </div>
                    <div className={cn(
                      "text-2xl font-semibold tracking-tight",
                      !hasData && "text-muted-foreground/40"
                    )}>
                      {hasData ? stats.currentMonth.requestCount : "—"}
                    </div>
                  </div>
                  <div>
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1.5",
                      hasData ? "text-muted-foreground" : "text-muted-foreground/60"
                    )}>
                      <Database className="size-3" />
                      {t('integrations.usage.cacheHits')}
                    </div>
                    <div className={cn(
                      "text-2xl font-semibold tracking-tight",
                      hasData ? "text-success" : "text-muted-foreground/40"
                    )}>
                      {hasData ? stats.currentMonth.cachedCount : "—"}
                    </div>
                  </div>
                  <div>
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1.5",
                      hasData ? "text-muted-foreground" : "text-muted-foreground/60"
                    )}>
                      <DollarSign className="size-3" />
                      {t('integrations.usage.estCost')}
                    </div>
                    <div className={cn(
                      "text-2xl font-semibold tracking-tight",
                      !hasData && "text-muted-foreground/40"
                    )}>
                      {hasData ? formatCost(stats.currentMonth.estimatedCost) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Info Section */}
      <section className="space-y-6">
        <SettingsSectionHeader
          icon={Info}
          title={t('integrations.howItWorks.title')}
          description={t('integrations.howItWorks.subtitle')}
          color="blue"
        />

        <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Database className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium mb-0.5">{t('integrations.howItWorks.caching.title')}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('integrations.howItWorks.caching.description')}
                </p>
              </div>
            </div>
            <div className="h-px bg-linear-to-r from-border via-border/50 to-transparent" />
            <div className="flex gap-4">
              <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Zap className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium mb-0.5">{t('integrations.howItWorks.priority.title')}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('integrations.howItWorks.priority.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
