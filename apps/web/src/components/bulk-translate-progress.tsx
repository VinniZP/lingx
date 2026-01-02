'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, X, Sparkles, Zap, SkipForward, XCircle } from 'lucide-react';
import type { JobProgress, BulkTranslateSyncResult } from '@/lib/api';
import { cn } from '@/lib/utils';

interface BulkTranslateProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'MT' | 'AI' | null;
  progress: JobProgress | null;
  isRunning: boolean;
  isComplete: boolean;
  result: BulkTranslateSyncResult | null;
  error: string | null;
  onCancel: () => void;
}

export function BulkTranslateProgress({
  open,
  onOpenChange,
  provider,
  progress,
  isRunning,
  isComplete,
  result,
  error,
  onCancel,
}: BulkTranslateProgressProps) {
  const { t } = useTranslation();

  const percent = progress
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const handleClose = () => {
    if (isRunning) {
      onCancel();
    }
    onOpenChange(false);
  };

  const translatedCount = result?.translated ?? progress?.translated ?? 0;
  const skippedCount = result?.skipped ?? progress?.skipped ?? 0;
  const failedCount = result?.failed ?? progress?.failed ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with gradient accent */}
        <DialogHeader className="relative px-6 pt-6 pb-4">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative flex items-start gap-4">
            {/* Provider icon with glow */}
            <div className={cn(
              'relative flex items-center justify-center size-12 rounded-xl',
              'bg-linear-to-br from-primary/10 to-primary/5',
              'ring-1 ring-primary/20',
              isRunning && 'animate-pulse'
            )}>
              {provider === 'AI' ? (
                <Sparkles className="size-5 text-primary" />
              ) : (
                <Zap className="size-5 text-primary" />
              )}
              {/* Glow effect when running */}
              {isRunning && (
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {t('translations.bulkTranslate.title')}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {provider === 'AI'
                  ? t('translations.bulkTranslate.usingAI')
                  : t('translations.bulkTranslate.usingMT')
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Progress Section */}
          {isRunning && progress && (
            <div className="space-y-3">
              {/* Custom progress bar with glow */}
              <div className="relative">
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  {/* Progress fill with shimmer */}
                  <div
                    className="progress-bar-shimmer h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {/* Glow under progress */}
                <div
                  className="absolute top-1 h-2 bg-primary/30 blur-md rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Progress info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums tracking-tight">
                    {percent}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {progress.processed} / {progress.total}
                  </span>
                </div>

                {progress.currentKey && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground max-w-[200px]">
                    <span className="shrink-0">{t('translations.bulkTranslate.translating')}:</span>
                    <code className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded truncate">
                      {progress.currentKey}
                    </code>
                    {progress.currentLang && (
                      <span className="shrink-0 text-primary font-medium">→ {progress.currentLang}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completion state */}
          {isComplete && !error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-success/5 ring-1 ring-success/20">
              <div className="flex items-center justify-center size-10 rounded-full bg-success/10">
                <CheckCircle2 className="size-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-success">{t('translations.bulkTranslate.complete')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('translations.bulkTranslate.completedMessage', { count: translatedCount })}
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {(isRunning || isComplete) && (progress || result) && (
            <div className="grid grid-cols-3 gap-3">
              {/* Translated */}
              <div className={cn(
                'relative p-4 rounded-xl text-center',
                'bg-linear-to-br from-success/10 to-success/5',
                'ring-1 ring-success/20',
                'transition-all duration-300',
                translatedCount > 0 && 'shadow-sm'
              )}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <CheckCircle2 className="size-4 text-success" />
                  <span className="text-2xl font-semibold tabular-nums text-success">
                    {translatedCount}
                  </span>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('translations.bulkTranslate.translated')}
                </p>
              </div>

              {/* Skipped */}
              <div className={cn(
                'relative p-4 rounded-xl text-center',
                'bg-linear-to-br from-muted/50 to-muted/30',
                'ring-1 ring-border',
                'transition-all duration-300'
              )}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <SkipForward className="size-4 text-muted-foreground" />
                  <span className="text-2xl font-semibold tabular-nums text-muted-foreground">
                    {skippedCount}
                  </span>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('translations.bulkTranslate.skipped')}
                </p>
              </div>

              {/* Failed */}
              <div className={cn(
                'relative p-4 rounded-xl text-center transition-all duration-300',
                failedCount > 0
                  ? 'bg-linear-to-br from-destructive/10 to-destructive/5 ring-1 ring-destructive/20 shadow-sm'
                  : 'bg-linear-to-br from-muted/50 to-muted/30 ring-1 ring-border'
              )}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <XCircle className={cn(
                    'size-4',
                    failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'text-2xl font-semibold tabular-nums',
                    failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {failedCount}
                  </span>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('translations.bulkTranslate.failedLabel')}
                </p>
              </div>
            </div>
          )}

          {/* Errors list */}
          {(progress?.errors?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  {t('translations.bulkTranslate.errors')} ({progress?.errors?.length})
                </p>
              </div>
              <ScrollArea className="h-32 rounded-xl ring-1 ring-destructive/20 bg-destructive/5 p-3">
                <div className="space-y-2">
                  {progress?.errors?.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm p-2 rounded-lg bg-background/50"
                    >
                      <XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <code className="font-mono text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                            {err.keyName}
                          </code>
                          <span className="text-xs text-muted-foreground">({err.language})</span>
                        </div>
                        <p className="text-xs text-destructive/80 mt-0.5">{err.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 ring-1 ring-destructive/20">
              <div className="flex items-center justify-center size-10 rounded-full bg-destructive/10 shrink-0">
                <AlertCircle className="size-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-destructive">{t('translations.bulkTranslate.failed')}</p>
                <p className="text-sm text-destructive/80 mt-0.5 break-words">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {isRunning && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="gap-2"
              >
                <X className="size-4" />
                {t('common.cancel')}
              </Button>
            )}
            {isComplete && (
              <Button
                onClick={() => onOpenChange(false)}
                className="gap-2 min-w-[100px]"
              >
                {t('common.close')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
