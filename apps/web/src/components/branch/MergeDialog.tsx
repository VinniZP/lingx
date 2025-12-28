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
import type { BranchDiffResult, Resolution } from '@/lib/api';
import { ConflictResolver } from './ConflictResolver';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diff: BranchDiffResult;
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <GitMerge className="h-5 w-5 text-white" />
            </span>
            <span>
              Merge{' '}
              <span className="font-mono text-indigo-600">
                {diff.source.name}
              </span>{' '}
              into{' '}
              <span className="font-mono text-violet-600">
                {diff.target.name}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription className="mt-2">
            Review changes and resolve any conflicts before merging.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-700">
                      {diff.added.length}
                    </div>
                    <div className="text-xs text-emerald-600">Added</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <Pencil className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-violet-700">
                      {diff.modified.length}
                    </div>
                    <div className="text-xs text-violet-600">Modified</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-rose-700">
                      {diff.deleted.length}
                    </div>
                    <div className="text-xs text-rose-600">Deleted</div>
                  </div>
                </div>

                {hasConflicts && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-300">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-700">
                        {diff.conflicts.length}
                      </div>
                      <div className="text-xs text-amber-600">Conflicts</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Conflicts warning */}
              {hasConflicts && (
                <Alert className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <AlertTitle className="text-amber-800 font-semibold">
                    Conflicts Detected
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    {diff.conflicts.length} translation key
                    {diff.conflicts.length > 1 ? 's have' : ' has'} been
                    modified in both branches. You must resolve all conflicts
                    before merging.
                  </AlertDescription>
                </Alert>
              )}

              {/* Merge error */}
              {mergeError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle>Merge Failed</AlertTitle>
                  <AlertDescription>{mergeError}</AlertDescription>
                </Alert>
              )}

              {/* No conflicts - ready to merge */}
              {!hasConflicts && totalChanges > 0 && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-800">
                        Ready to Merge
                      </h4>
                      <p className="text-sm text-emerald-600">
                        This merge will apply {totalChanges} change
                        {totalChanges !== 1 ? 's' : ''} to the target branch. No
                        conflicts were detected.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No changes */}
              {totalChanges === 0 && !hasConflicts && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <p className="text-slate-600">
                    No changes to merge. Both branches are identical.
                  </p>
                </div>
              )}

              {/* Changes preview list */}
              {totalChanges > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">
                    Changes Summary
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {diff.added.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50/50"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono text-sm text-emerald-700 truncate">
                          {entry.key}
                        </span>
                      </div>
                    ))}
                    {diff.modified.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 bg-violet-50/50"
                      >
                        <Pencil className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                        <span className="font-mono text-sm text-violet-700 truncate">
                          {entry.key}
                        </span>
                      </div>
                    ))}
                    {diff.deleted.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 bg-rose-50/50"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span className="font-mono text-sm text-rose-700 truncate line-through">
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

        <DialogFooter className="shrink-0 flex-row justify-between gap-2 border-t border-slate-200 pt-4">
          <div>
            {step === 'resolve' && (
              <Button variant="ghost" onClick={() => setStep('preview')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Preview
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {hasConflicts && step === 'preview' && (
              <Button
                onClick={() => setStep('resolve')}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Resolve Conflicts ({diff.conflicts.length})
              </Button>
            )}
            {(step === 'resolve' || !hasConflicts) && (
              <Button
                onClick={handleMerge}
                disabled={!canMerge || merging || totalChanges === 0}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
              >
                {merging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Merge Branch
                    {hasConflicts && !allConflictsResolved && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {resolutions.size}/{diff.conflicts.length} resolved
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
