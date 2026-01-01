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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@localeflow/sdk-nextjs';

/**
 * ApiKeysPage - Premium redesigned API keys management
 *
 * Features:
 * - Hero section with key icon and stats
 * - Asymmetric grid layout (7-5 split)
 * - Premium table styling with islands
 * - Sidebar with documentation and security tips
 * - Consistent button styling (primary purple)
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
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('apiKeys.loading')}</p>
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="island p-6 lg:p-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Icon */}
          <div className="relative shrink-0">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-warm/20 via-warm/10 to-primary/10 flex items-center justify-center border border-warm/20">
              <Key className="size-7 text-warm" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
                {t('apiKeys.pageTitle')}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {t('apiKeys.pageDescription')}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 sm:gap-8 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border sm:pl-8">
            <StatPill
              label={t('apiKeys.stats.active')}
              value={isLoading ? '-' : activeKeys.length}
              highlight={activeKeys.length > 0}
            />
            <div className="w-px h-8 bg-border hidden sm:block" />
            <StatPill
              label={t('apiKeys.stats.total')}
              value={isLoading ? '-' : apiKeys.length}
            />
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-6 pt-6 border-t border-border">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="h-11 gap-2 w-full sm:w-auto"
            data-testid="generate-key-button"
          >
            <Plus className="size-4" />
            {t('apiKeys.generateNew')}
          </Button>
        </div>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <div className="island p-6 border-warm/30 bg-warm/5 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-warm/20 flex items-center justify-center shrink-0">
                <Key className="size-5 text-warm" />
              </div>
              <div>
                <h3 className="font-semibold">{t('apiKeys.newKeyCreated')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('apiKeys.copyKeyNow')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setNewKey(null)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="relative">
            <code
              className="block p-4 bg-card rounded-xl border font-mono text-sm break-all pr-14"
              data-testid="new-api-key"
            >
              {newKey}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-10"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 text-warm shrink-0" />
            <span>{t('apiKeys.storeSecurely')}</span>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Content - Keys List */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Keys */}
          <div className="space-y-3 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('apiKeys.activeKeys')}
              </h2>
              <span className="text-xs text-muted-foreground">
                {activeKeys.length} {activeKeys.length === 1 ? t('apiKeys.key') : t('apiKeys.keys')}
              </span>
            </div>

            <div className="island divide-y divide-border">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : activeKeys.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="size-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Key className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">{t('apiKeys.noActiveKeys')}</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                    className="h-11"
                  >
                    {t('apiKeys.generateFirst')}
                  </Button>
                </div>
              ) : (
                activeKeys.map((key) => (
                  <ApiKeyRow
                    key={key.id}
                    apiKey={key}
                    onRevoke={() => revokeMutation.mutate(key.id)}
                    isRevoking={revokeMutation.isPending}
                  />
                ))
              )}
            </div>
          </div>

          {/* Revoked Keys */}
          {revokedKeys.length > 0 && (
            <div className="space-y-3 animate-fade-in-up stagger-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeys.revokedKeys')}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {revokedKeys.length} {revokedKeys.length === 1 ? t('apiKeys.key') : t('apiKeys.keys')}
                </span>
              </div>

              <div className="island divide-y divide-border opacity-60">
                {revokedKeys.map((key) => (
                  <div key={key.id} className="p-4 flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Key className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{key.name}</p>
                        <Badge variant="destructive" className="text-[10px] font-medium">
                          {t('apiKeys.revoked')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
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
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security Tips */}
          <div className="space-y-3 animate-fade-in-up stagger-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              {t('apiKeys.securityTips.title')}
            </h2>
            <div className="island divide-y divide-border">
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

          {/* Documentation Links */}
          <div className="space-y-3 animate-fade-in-up stagger-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              {t('apiKeys.docs.title')}
            </h2>
            <div className="island divide-y divide-border">
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
 * StatPill - Compact stat display
 */
function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={cn(
        "text-2xl font-semibold tracking-tight mt-0.5",
        highlight && "text-success"
      )}>
        {value}
      </p>
    </div>
  );
}

/**
 * ApiKeyRow - Individual API key display
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
    <div className="p-4 flex items-center gap-4 group">
      <div className="size-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
        <ShieldCheck className="size-4 text-success" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{apiKey.name}</p>
          <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-medium">
            {t('apiKeys.stats.active')}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <code className="text-xs text-muted-foreground font-mono">
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

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground hidden lg:block">
          {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              data-testid="revoke-key-button"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('apiKeys.revokeDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently revoke the API key{' '}
                <strong>{apiKey.name}</strong>. Any applications using this key
                will no longer be able to authenticate. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11">{t('apiKeys.revokeDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onRevoke}
                className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
 * SecurityTip - Security recommendation item
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
    good: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-info bg-info/10',
  };

  return (
    <div className="p-4 flex items-start gap-3">
      <div className={cn(
        'size-8 rounded-lg flex items-center justify-center shrink-0',
        statusColors[status]
      )}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/**
 * ResourceLink - Documentation link item
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
      className="p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors group"
    >
      <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
        <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </a>
  );
}
