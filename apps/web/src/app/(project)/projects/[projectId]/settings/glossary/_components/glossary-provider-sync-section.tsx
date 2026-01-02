'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RefreshCw,
  Sparkles,
  Zap,
  Languages,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GlossarySyncStatus, GlossaryStats, MTProvider } from '@/lib/api';

interface GlossaryProviderSyncSectionProps {
  syncStatuses: GlossarySyncStatus[];
  stats: GlossaryStats | undefined;
  isSyncing: boolean;
  onSync: (provider: MTProvider, srcLang: string, tgtLang: string) => void;
  onDeleteSync: (provider: MTProvider, srcLang: string, tgtLang: string) => void;
}

export function GlossaryProviderSyncSection({
  syncStatuses,
  stats,
  isSyncing,
  onSync,
  onDeleteSync,
}: GlossaryProviderSyncSectionProps) {
  const { t } = useTranslation('glossary');

  return (
    <section className="space-y-6 animate-fade-in-up stagger-5">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-linear-to-br from-blue-500/20 via-blue-500/10 to-transparent border border-blue-500/10 flex items-center justify-center shadow-sm">
          <RefreshCw className="size-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t('providerSync.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('providerSync.description')}
          </p>
        </div>
      </div>

      <div className="island p-6 space-y-5">
        {/* Info banner */}
        <div className="flex items-start gap-4 p-5 rounded-xl bg-linear-to-r from-primary/5 via-primary/[0.02] to-transparent border border-primary/10">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">
              {t('providerSync.consistency')}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('providerSync.consistencyDescription')}
            </p>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatuses.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('providerSync.activeSyncs')}
              </h4>
              <Badge variant="secondary" className="text-[10px]">
                {t('providerSync.connected', { count: syncStatuses.length })}
              </Badge>
            </div>
            <div className="divide-y divide-border/50 rounded-xl border border-border/50 overflow-hidden">
              {syncStatuses.map((sync) => (
                <div
                  key={`${sync.provider}-${sync.sourceLanguage}-${sync.targetLanguage}`}
                  className="px-5 py-4 flex items-center justify-between bg-card/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "size-10 rounded-xl flex items-center justify-center",
                      sync.provider === 'DEEPL' ? "bg-[#0F2B46]/10" : "bg-emerald-500/10"
                    )}>
                      <Languages className={cn(
                        "size-5",
                        sync.provider === 'DEEPL' ? "text-[#0F2B46] dark:text-blue-400" : "text-emerald-500"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold">
                          {sync.provider === 'DEEPL' ? 'DeepL' : 'Google Translate'}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold",
                          sync.syncStatus === 'synced'
                            ? "bg-success/15 text-success"
                            : sync.syncStatus === 'error'
                            ? "bg-destructive/15 text-destructive"
                            : "bg-amber-500/15 text-amber-600"
                        )}>
                          {sync.syncStatus === 'synced' && <Check className="size-3" />}
                          {sync.syncStatus === 'error' && <AlertCircle className="size-3" />}
                          {sync.syncStatus === 'pending' && <Loader2 className="size-3 animate-spin" />}
                          {sync.syncStatus}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sync.sourceLanguage} → {sync.targetLanguage} · {t('providerSync.termsSynced', { count: sync.entriesCount })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteSync(sync.provider, sync.sourceLanguage, sync.targetLanguage)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Zap className="size-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium mb-1">
              {t('providerSync.noSyncs')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('providerSync.connectBelow')}
            </p>
          </div>
        )}

        {/* Quick Sync Actions */}
        {stats && stats.languagePairs.length > 0 && (
          <div className="pt-5 border-t border-border/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {t('providerSync.quickSync')}
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {stats.languagePairs.slice(0, 4).map((pair) => (
                <DropdownMenu key={`${pair.sourceLanguage}-${pair.targetLanguage}`}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 pl-3 pr-2">
                      <span className="font-mono text-xs">{pair.sourceLanguage}</span>
                      <ChevronRight className="size-3 text-muted-foreground" />
                      <span className="font-mono text-xs">{pair.targetLanguage}</span>
                      <Badge variant="secondary" className="text-[10px] ml-1 tabular-nums">
                        {pair.count}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => onSync('DEEPL', pair.sourceLanguage, pair.targetLanguage)}
                      disabled={isSyncing}
                    >
                      <Languages className="size-4 mr-2 text-[#0F2B46] dark:text-blue-400" />
                      {t('providerSync.syncToDeepL')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSync('GOOGLE_TRANSLATE', pair.sourceLanguage, pair.targetLanguage)}
                      disabled={isSyncing}
                    >
                      <Languages className="size-4 mr-2 text-emerald-500" />
                      {t('providerSync.syncToGoogle')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
