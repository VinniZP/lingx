'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ApiKeyDialog } from '@/components/api-key-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Key,
  Trash2,
  Copy,
  Check,
  Languages,
  AlertTriangle,
  ShieldCheck,
  X,
  ChevronRight,
  BookOpen,
  Terminal,
  Shield,
  RotateCcw,
  Clock,
  ArrowLeft,
  Sparkles,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@localeflow/sdk-nextjs';

/**
 * ApiKeysPage - Premium redesigned API keys management
 *
 * Features:
 * - Premium atmospheric backdrop with gradient orbs
 * - Hero section with glow effect matching security page
 * - Refined back navigation with icon container
 * - Premium islands with subtle shadows
 * - Sidebar with documentation and security tips
 */
export default function ApiKeysPage() {
  const { t } = useTranslation();
  const { isManager, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      // Only show toast if no field errors (field errors show in the dialog)
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

  const copyToClipboard = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success(t('apiKeys.copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('apiKeys.copyFailed'));
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-warm/20 rounded-3xl blur-2xl scale-125" />
            <div className="relative size-20 rounded-3xl bg-gradient-to-br from-warm/20 to-warm/5 flex items-center justify-center border border-warm/20">
              <Key className="size-10 text-warm animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-3xl border-2 border-warm/30 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground mb-1">{t('apiKeys.loading')}</p>
            <p className="text-sm text-muted-foreground">{t('common.pleaseWait')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return null;
  }

  const apiKeys = apiKeysData ?? [];
  const activeKeys = apiKeys.filter((k) => !k.revoked);
  const revokedKeys = apiKeys.filter((k) => k.revoked);

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-16">
      {/* Premium atmospheric backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-bl from-warm/[0.08] via-warm/[0.04] to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 animate-pulse" style={{ animationDuration: '8s' }} />
        {/* Secondary accent orb */}
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-to-tr from-primary/[0.06] via-primary/[0.02] to-transparent rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        {/* Floating accent orb */}
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-r from-warm/[0.04] to-primary/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '12s' }} />
        {/* Refined grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Back navigation - refined with icon container */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 group mb-12 animate-fade-in-up"
      >
        <div className="size-9 rounded-xl bg-card border border-border/50 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300 shadow-sm">
          <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </div>
        <span className="font-medium tracking-tight">{t('settings.backToSettings')}</span>
      </Link>

      {/* Premium Page Header */}
      <div className="relative mb-12 animate-fade-in-up stagger-1">
        <div className="island overflow-hidden border-0 shadow-lg shadow-warm/[0.03]">
          {/* Gradient accent band */}
          <div className="h-1.5 bg-gradient-to-r from-warm via-warm/70 to-primary" />

          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              {/* Icon with premium glow effect */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-warm/25 rounded-3xl blur-2xl scale-110" />
                <div className="absolute inset-0 bg-gradient-to-br from-warm/30 to-primary/20 rounded-3xl blur-xl" />
                <div className="relative size-20 lg:size-24 rounded-3xl bg-gradient-to-br from-warm/20 via-warm/10 to-primary/5 flex items-center justify-center border border-warm/20 backdrop-blur-sm">
                  <Key className="size-10 lg:size-12 text-warm" />
                  <Sparkles className="absolute -top-1 -right-1 size-5 text-warm animate-pulse" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                  {t('apiKeys.pageTitle')}
                </h1>
                <p className="text-muted-foreground text-base lg:text-lg max-w-xl leading-relaxed">
                  {t('apiKeys.pageDescription')}
                </p>
              </div>

              {/* Stats Widget */}
              <div className="shrink-0 p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 min-w-[180px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('apiKeys.stats.active')}</span>
                    <span className={cn(
                      "text-2xl font-bold tracking-tight",
                      activeKeys.length > 0 ? "text-success" : "text-foreground"
                    )}>
                      {isLoading ? '-' : activeKeys.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">{t('apiKeys.stats.total')}</span>
                    <span className="text-lg font-semibold">
                      {isLoading ? '-' : apiKeys.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8 pt-8 border-t border-border/40">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="h-12 rounded-xl gap-2.5 px-6 shadow-lg shadow-primary/15"
                data-testid="generate-key-button"
              >
                <Plus className="size-5" />
                {t('apiKeys.generateNew')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* New Key Alert - Premium styling */}
      {newKey && (
        <div className="mb-8 animate-fade-in-up stagger-2">
          <div className="island overflow-hidden border-0 shadow-lg shadow-success/[0.05] bg-gradient-to-br from-success/5 via-transparent to-transparent">
            <div className="h-1 bg-gradient-to-r from-success via-success/70 to-success/40" />
            <div className="p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-success/30 rounded-2xl blur-lg" />
                    <div className="relative size-14 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center border border-success/20">
                      <KeyRound className="size-7 text-success" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-0.5">{t('apiKeys.newKeyCreated')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('apiKeys.copyKeyNow')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-xl hover:bg-muted/50"
                  onClick={() => setNewKey(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="relative group">
                <code
                  className="block p-5 bg-muted/30 rounded-2xl border border-border/40 font-mono text-sm break-all pr-16"
                  data-testid="new-api-key"
                >
                  {newKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-11 rounded-xl border-border/50 bg-card shadow-sm group-hover:border-success/30 transition-colors"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="size-5 text-success" />
                  ) : (
                    <Copy className="size-5" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-3 mt-5 p-4 rounded-xl bg-warning/5 border border-warning/20">
                <AlertTriangle className="size-5 text-warning shrink-0" />
                <span className="text-sm text-muted-foreground">{t('apiKeys.storeSecurely')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout - Premium styling */}
      <div className="grid gap-8 lg:gap-10 lg:grid-cols-12">
        {/* Main Content - Keys List */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Active Keys */}
          <section className="animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-success/10 flex items-center justify-center">
                  <ShieldCheck className="size-3.5 text-success" />
                </div>
                {t('apiKeys.activeKeys')}
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                {activeKeys.length} {activeKeys.length === 1 ? t('apiKeys.key') : t('apiKeys.keys')}
              </span>
            </div>

            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              {isLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : activeKeys.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="relative mx-auto mb-6">
                    <div className="absolute inset-0 bg-muted/50 rounded-3xl blur-xl scale-150" />
                    <div className="relative size-20 rounded-3xl bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center border border-border/40">
                      <Key className="size-10 text-muted-foreground/60" />
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6 text-base">{t('apiKeys.noActiveKeys')}</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                    className="h-12 rounded-xl px-6 gap-2"
                  >
                    <Plus className="size-4" />
                    {t('apiKeys.generateFirst')}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
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
              <div className="flex items-center justify-between mb-5 px-1">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                  <div className="size-6 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Key className="size-3.5 text-muted-foreground" />
                  </div>
                  {t('apiKeys.revokedKeys')}
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  {revokedKeys.length} {revokedKeys.length === 1 ? t('apiKeys.key') : t('apiKeys.keys')}
                </span>
              </div>

              <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02] opacity-70">
                <div className="divide-y divide-border/40">
                  {revokedKeys.map((key) => (
                    <div key={key.id} className="p-5 flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/30">
                        <Key className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <p className="font-medium truncate">{key.name}</p>
                          <Badge variant="destructive" className="text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {t('apiKeys.revoked')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {key.keyPrefix}...
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
          {/* Security Tips */}
          <section className="animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Shield className="size-3.5 text-warning" />
                </div>
                {t('apiKeys.securityTips.title')}
              </h3>
            </div>
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              <div className="divide-y divide-border/40">
                <SecurityTip
                  icon={Shield}
                  status="info"
                  title={t('apiKeys.securityTips.keepSecret')}
                  description={t('apiKeys.securityTips.keepSecretDesc')}
                />
                <SecurityTip
                  icon={RotateCcw}
                  status="warning"
                  title={t('apiKeys.securityTips.rotateRegularly')}
                  description={t('apiKeys.securityTips.rotateRegularlyDesc')}
                />
                <SecurityTip
                  icon={Clock}
                  status="good"
                  title={t('apiKeys.securityTips.monitorUsage')}
                  description={t('apiKeys.securityTips.monitorUsageDesc')}
                />
              </div>
            </div>
          </section>

          {/* Documentation Links */}
          <section className="animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="size-3.5 text-primary" />
                </div>
                {t('apiKeys.docs.title')}
              </h3>
            </div>
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              <div className="divide-y divide-border/40">
                <ResourceLink
                  href="https://docs.localeflow.dev/cli"
                  icon={Terminal}
                  title={t('apiKeys.docs.cliSetup')}
                  description={t('apiKeys.docs.cliSetupDesc')}
                />
                <ResourceLink
                  href="https://docs.localeflow.dev/sdk"
                  icon={BookOpen}
                  title={t('apiKeys.docs.sdkIntegration')}
                  description={t('apiKeys.docs.sdkIntegrationDesc')}
                />
                <ResourceLink
                  href="https://docs.localeflow.dev/api"
                  icon={Key}
                  title={t('apiKeys.docs.apiReference')}
                  description={t('apiKeys.docs.apiReferenceDesc')}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Create Dialog */}
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


/**
 * ApiKeyRow - Individual API key display with premium styling
 */
function ApiKeyRow({
  apiKey,
  onRevoke,
  isRevoking,
}: {
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    lastUsedAt: string | null;
    createdAt: string;
  };
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="p-5 flex items-center gap-5 group hover:bg-muted/20 transition-colors">
      <div className="size-12 rounded-xl bg-gradient-to-br from-success/15 to-success/5 flex items-center justify-center shrink-0 border border-success/20">
        <ShieldCheck className="size-5 text-success" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <p className="font-semibold truncate">{apiKey.name}</p>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
            {t('apiKeys.stats.active')}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <code className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-md">
            {apiKey.keyPrefix}...
          </code>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            · {t('apiKeys.lastUsed')}{' '}
            {apiKey.lastUsedAt
              ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })
              : t('apiKeys.never')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground hidden lg:block">
          {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              data-testid="revoke-key-button"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-0 shadow-2xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">{t('apiKeys.revokeDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground leading-relaxed">
                This will permanently revoke the API key{' '}
                <strong className="text-foreground">{apiKey.name}</strong>. Any applications using this key
                will no longer be able to authenticate. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-2">
              <AlertDialogCancel className="h-12 rounded-xl">{t('apiKeys.revokeDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onRevoke}
                className="h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20"
              >
                {isRevoking ? t('apiKeys.revokeDialog.revoking') : t('apiKeys.revokeDialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/**
 * SecurityTip - Security recommendation item with premium styling
 */
function SecurityTip({
  icon: Icon,
  status,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  status: 'good' | 'warning' | 'info';
  title: string;
  description: string;
}) {
  const statusColors = {
    good: { icon: 'text-success', bg: 'from-success/15 to-success/5', border: 'border-success/20' },
    warning: { icon: 'text-warning', bg: 'from-warning/15 to-warning/5', border: 'border-warning/20' },
    info: { icon: 'text-info', bg: 'from-info/15 to-info/5', border: 'border-info/20' },
  };

  const colors = statusColors[status];

  return (
    <div className="p-5 flex items-start gap-4">
      <div className={cn(
        'size-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br border',
        colors.bg,
        colors.border
      )}>
        <Icon className={cn('size-5', colors.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/**
 * ResourceLink - Documentation link item with premium styling
 */
function ResourceLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors group"
    >
      <div className="size-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors border border-border/30 group-hover:border-primary/20">
        <Icon className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <ExternalLink className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </a>
  );
}
