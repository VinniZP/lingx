'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  Check,
  GitMerge,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { BranchDiffResponse } from '@lingx/shared';
import type { Resolution } from '@/lib/api';
import { ConflictResolver } from './ConflictResolver';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diff: BranchDiffResponse;
  onMerge: (resolutions: Resolution[]) => Promise<void>;
  merging: boolean;
  mergeError?: string;
}

export function MergeDialog({
  open,
  onOpenChange,
  diff,
  onMerge,
  merging,
  mergeError,
}: MergeDialogProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(
    new Map()
  );
  const [step, setStep] = useState<'preview' | 'resolve'>('preview');

  const hasConflicts = diff.conflicts.length > 0;
  const allConflictsResolved = diff.conflicts.every((c) =>
    resolutions.has(c.key)
  );
  const canMerge = !hasConflicts || allConflictsResolved;

  const handleResolve = (key: string, resolution: Resolution) => {
    setResolutions((prev) => new Map(prev).set(key, resolution));
  };

  const handleClearResolution = (key: string) => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const handleMerge = async () => {
    await onMerge(Array.from(resolutions.values()));
  };

  const handleClose = () => {
    setResolutions(new Map());
    setStep('preview');
    onOpenChange(false);
  };

  const totalChanges =
    diff.added.length + diff.modified.length + diff.deleted.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col w-[95vw] md:w-auto p-4 md:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-xl">
            <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <GitMerge className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </span>
            <span className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1 min-w-0">
              <span className="text-sm md:text-lg">{t('branch.mergeDialog.merge')}</span>
              <span className="font-mono text-indigo-600 text-sm md:text-lg truncate">
                {diff.source.name}
              </span>
              <span className="text-sm md:text-lg hidden md:inline">{t('branch.mergeDialog.into')}</span>
              <span className="font-mono text-violet-600 text-sm md:text-lg truncate">
                {isMobile ? `-> ${diff.target.name}` : diff.target.name}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm">
            {t('branch.mergeDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 md:py-4 min-h-0">
          {step === 'preview' && (
            <div className="space-y-4 md:space-y-6">
              {/* Summary Stats - 2 columns on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-emerald-50 border border-emerald-200 touch-manipulation">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-bold text-emerald-700">
                      {diff.added.length}
                    </div>
                    <div className="text-xs text-emerald-600">{t('branch.mergeDialog.stats.added')}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-violet-50 border border-violet-200 touch-manipulation">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-bold text-violet-700">
                      {diff.modified.length}
                    </div>
                    <div className="text-xs text-violet-600">{t('branch.mergeDialog.stats.modified')}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-rose-50 border border-rose-200 touch-manipulation">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-bold text-rose-700">
                      {diff.deleted.length}
                    </div>
                    <div className="text-xs text-rose-600">{t('branch.mergeDialog.stats.deleted')}</div>
                  </div>
                </div>

                {hasConflicts && (
                  <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-amber-50 border border-amber-300 touch-manipulation">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-base md:text-lg font-bold text-amber-700">
                        {diff.conflicts.length}
                      </div>
                      <div className="text-xs text-amber-600">{t('branch.mergeDialog.stats.conflicts')}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Conflicts warning */}
              {hasConflicts && (
                <Alert className="border-amber-300 bg-linear-to-r from-amber-50 to-orange-50">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                  <AlertTitle className="text-amber-800 font-semibold text-sm md:text-base">
                    {t('branch.mergeDialog.conflictsDetected')}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 text-sm">
                    {t('branch.mergeDialog.conflictsDescription', { count: diff.conflicts.length })}
                  </AlertDescription>
                </Alert>
              )}

              {/* Merge error */}
              {mergeError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
                  <AlertTitle className="text-sm md:text-base">{t('branch.mergeDialog.mergeFailed')}</AlertTitle>
                  <AlertDescription className="text-sm">{mergeError}</AlertDescription>
                </Alert>
              )}

              {/* No conflicts - ready to merge */}
              {!hasConflicts && totalChanges > 0 && (
                <div className="p-3 md:p-4 rounded-lg bg-linear-to-r from-emerald-50 to-green-50 border border-emerald-200">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-800 text-sm md:text-base">
                        {t('branch.mergeDialog.readyToMerge')}
                      </h4>
                      <p className="text-xs md:text-sm text-emerald-600">
                        {t('branch.mergeDialog.readyToMergeDescription', { count: totalChanges })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No changes */}
              {totalChanges === 0 && !hasConflicts && (
                <div className="p-3 md:p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <p className="text-slate-600 text-sm">
                    {t('branch.mergeDialog.noChanges')}
                  </p>
                </div>
              )}

              {/* Changes preview list */}
              {totalChanges > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">
                    {t('branch.mergeDialog.changesSummary')}
                  </h4>
                  <div className="max-h-36 md:max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {diff.added.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50/50 touch-manipulation min-h-[40px]"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs md:text-sm text-emerald-700 truncate">
                          {entry.key}
                        </span>
                      </div>
                    ))}
                    {diff.modified.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 bg-violet-50/50 touch-manipulation min-h-[40px]"
                      >
                        <Pencil className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                        <span className="font-mono text-xs md:text-sm text-violet-700 truncate">
                          {entry.key}
                        </span>
                      </div>
                    ))}
                    {diff.deleted.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 bg-rose-50/50 touch-manipulation min-h-[40px]"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span className="font-mono text-xs md:text-sm text-rose-700 truncate line-through">
                          {entry.key}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'resolve' && (
            <ConflictResolver
              conflicts={diff.conflicts}
              resolutions={resolutions}
              onResolve={handleResolve}
              onClearResolution={handleClearResolution}
            />
          )}
        </div>

        {/* Footer - stacked on mobile, row on desktop */}
        <DialogFooter className="shrink-0 flex-col md:flex-row gap-2 border-t border-slate-200 pt-4">
          {/* Mobile: Show back button at top if in resolve step */}
          {isMobile && step === 'resolve' && (
            <Button
              variant="ghost"
              onClick={() => setStep('preview')}
              className="w-full h-11 touch-manipulation order-first"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('branch.mergeDialog.backToPreview')}
            </Button>
          )}

          {/* Desktop: Back button in left section */}
          {!isMobile && step === 'resolve' && (
            <div className="flex-1">
              <Button variant="ghost" onClick={() => setStep('preview')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('branch.mergeDialog.backToPreview')}
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
            {hasConflicts && step === 'preview' && (
              <Button
                onClick={() => setStep('resolve')}
                className={`bg-amber-500 hover:bg-amber-600 text-white touch-manipulation ${isMobile ? 'w-full h-11' : ''}`}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {t('branch.mergeDialog.resolveConflicts', { count: diff.conflicts.length })}
              </Button>
            )}
            {(step === 'resolve' || !hasConflicts) && (
              <Button
                onClick={handleMerge}
                disabled={!canMerge || merging || totalChanges === 0}
                className={`bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white touch-manipulation ${isMobile ? 'w-full h-11' : ''}`}
              >
                {merging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('branch.mergeDialog.merging')}
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4 mr-2" />
                    {t('branch.mergeDialog.mergeBranch')}
                    {hasConflicts && !allConflictsResolved && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {t('branch.mergeDialog.resolvedCount', { resolved: resolutions.size, total: diff.conflicts.length })}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleClose}
              className={`touch-manipulation ${isMobile ? 'w-full h-11' : ''}`}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
