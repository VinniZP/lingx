'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConflictEntry } from '@lingx/shared';
import { useTranslation } from '@lingx/sdk-nextjs';
import {
  branchApi,
  ApiError,
  ProjectTreeBranch,
  Resolution,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  GitBranch,
  Star,
  GitMerge,
  Plus,
  Minus,
  Edit3,
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  ChevronRight,
  Sparkles,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MergeBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sourceBranch: ProjectTreeBranch | null;
  allBranches: ProjectTreeBranch[];
}

type StepType = 'select' | 'preview' | 'conflicts';

/**
 * MergeBranchDialog - Premium dialog for merging branches
 *
 * Features a visual merge flow with step indicator and conflict resolution.
 */
export function MergeBranchDialog({
  open,
  onOpenChange,
  projectId,
  sourceBranch,
  allBranches,
}: MergeBranchDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [targetBranchId, setTargetBranchId] = useState('');
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [step, setStep] = useState<StepType>('select');

  // Steps with translated labels
  const steps: { key: StepType; label: string }[] = [
    { key: 'select', label: t('dialogs.mergeBranch.steps.select') },
    { key: 'preview', label: t('dialogs.mergeBranch.steps.preview') },
    { key: 'conflicts', label: t('dialogs.mergeBranch.steps.resolve') },
  ];

  // Get available target branches (exclude the source branch)
  const targetBranches = useMemo(
    () => allBranches.filter((b) => b.id !== sourceBranch?.id),
    [allBranches, sourceBranch?.id]
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open && sourceBranch) {
      const defaultBranch = targetBranches.find((b) => b.isDefault);
      setTargetBranchId(defaultBranch?.id || targetBranches[0]?.id || '');
      setResolutions([]);
      setStep('select');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceBranch?.id]);

  // Fetch diff when both branches are selected
  const {
    data: diff,
    isLoading: diffLoading,
    error: diffError,
    refetch: refetchDiff,
  } = useQuery({
    queryKey: ['branch-diff', sourceBranch?.id, targetBranchId],
    queryFn: () =>
      sourceBranch && targetBranchId
        ? branchApi.diff(sourceBranch.id, targetBranchId)
        : Promise.reject('No branches selected'),
    enabled: !!sourceBranch && !!targetBranchId && step !== 'select',
  });

  const mergeMutation = useMutation({
    mutationFn: () => {
      if (!sourceBranch) throw new Error('No source branch');
      return branchApi.merge(sourceBranch.id, {
        targetBranchId,
        resolutions: resolutions.length > 0 ? resolutions : undefined,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
        queryClient.invalidateQueries({ queryKey: ['keys'] });
        toast.success(t('dialogs.mergeBranch.success'), {
          description: t('dialogs.mergeBranch.successDescription', {
            count: result.merged,
            branch: targetBranches.find((b) => b.id === targetBranchId)?.name || 'target branch'
          }),
        });
        onOpenChange(false);
      } else if (result.conflicts && result.conflicts.length > 0) {
        setStep('conflicts');
        toast.warning(t('dialogs.mergeBranch.conflictsDetected'), {
          description: t('dialogs.mergeBranch.conflictsDescription', { count: result.conflicts.length }),
        });
      }
    },
    onError: (error: ApiError) => {
      toast.error(t('dialogs.mergeBranch.failed'), {
        description: error.message,
      });
    },
  });

  const handlePreview = () => {
    setStep('preview');
    refetchDiff();
  };

  const handleMerge = () => {
    mergeMutation.mutate();
  };

  const handleResolveConflict = (key: string, resolution: 'source' | 'target') => {
    setResolutions((prev) => {
      const existing = prev.filter((r) => r.key !== key);
      return [...existing, { key, resolution }];
    });
  };

  const targetBranch = targetBranches.find((b) => b.id === targetBranchId);
  const hasChanges =
    diff &&
    (diff.added.length > 0 || diff.modified.length > 0 || diff.deleted.length > 0);
  const hasConflicts = diff && diff.conflicts && diff.conflicts.length > 0;
  const allConflictsResolved =
    !hasConflicts || (diff?.conflicts?.length || 0) === resolutions.length;

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <GitMerge className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {t('dialogs.mergeBranch.title')}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t('dialogs.mergeBranch.description', { branch: sourceBranch?.name || '' })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-5">
            {steps.map((s, index) => {
              const isActive = s.key === step;
              const isCompleted = index < currentStepIndex;
              const isConflictStep = s.key === 'conflicts';
              // Hide conflicts step if no conflicts detected
              if (isConflictStep && step !== 'conflicts' && !hasConflicts) return null;

              return (
                <div key={s.key} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="size-3.5 text-muted-foreground/40 mx-1" />
                  )}
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                      isActive && 'bg-primary/20 text-primary',
                      isCompleted && 'text-primary/70',
                      !isActive && !isCompleted && 'text-muted-foreground/60'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-3" />
                    ) : (
                      <Circle className={cn('size-2', isActive && 'fill-current')} />
                    )}
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step: Select target branch */}
        {step === 'select' && (
          <div className="px-6 pb-6">
            <div className="space-y-5 pt-2">
              {/* Branch selection */}
              <div className="space-y-3">
                {/* Source branch card */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    {t('dialogs.mergeBranch.sourceBranch')}
                  </Label>
                  <div className="flex items-center gap-3 py-3 px-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <GitBranch className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{sourceBranch?.name}</span>
                        {sourceBranch?.isDefault && (
                          <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t('dialogs.mergeBranch.translationKeys', { count: sourceBranch?.keyCount || 0 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="flex justify-center py-1">
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                    <ArrowRight className="size-3 rotate-90 text-muted-foreground" />
                  </div>
                </div>

                {/* Target branch select */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    {t('dialogs.mergeBranch.targetBranch')}
                  </Label>
                  <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                    <SelectTrigger size="auto" className="py-3 px-3 rounded-xl [&>span]:flex-1">
                      <SelectValue placeholder={t('dialogs.mergeBranch.selectTargetBranch')}>
                        {targetBranch && (
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <GitBranch className="size-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">{targetBranch.name}</span>
                                {targetBranch.isDefault && (
                                  <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {t('dialogs.mergeBranch.translationKeys', { count: targetBranch.keyCount })}
                              </span>
                            </div>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {targetBranches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id} className="py-2.5">
                          <div className="flex items-center gap-2">
                            <GitBranch className="size-4 text-muted-foreground" />
                            <span className="font-medium">{branch.name}</span>
                            {branch.isDefault && (
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {t('common.keys', { count: branch.keyCount })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">{t('dialogs.mergeBranch.howItWorks')}</p>
                  <p>{t('dialogs.mergeBranch.howItWorksNote')}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 sm:flex-none"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!targetBranchId}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                {t('dialogs.mergeBranch.previewChanges')}
                <ChevronRight className="size-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Preview changes */}
        {step === 'preview' && (
          <div className="px-6 pb-6">
            <div className="space-y-4 pt-2">
              {/* Branch summary badges */}
              <div className="flex items-center gap-2 py-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                  <GitBranch className="size-3.5" />
                  {sourceBranch?.name}
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-sm font-medium">
                  <GitBranch className="size-3.5" />
                  {targetBranch?.name}
                </div>
              </div>

              {/* Diff preview */}
              {diffLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">{t('dialogs.mergeBranch.comparingBranches')}</p>
                </div>
              ) : diffError ? (
                <div className="text-center py-12">
                  <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="size-5 text-destructive" />
                  </div>
                  <p className="text-sm text-destructive font-medium">{t('dialogs.mergeBranch.failedToLoadDiff')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('dialogs.mergeBranch.pleaseTryAgain')}</p>
                </div>
              ) : !hasChanges && !hasConflicts ? (
                <div className="text-center py-12">
                  <div className="size-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="size-7 text-success" />
                  </div>
                  <p className="font-semibold text-lg mb-1">{t('dialogs.mergeBranch.branchesInSync')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('dialogs.mergeBranch.noChanges')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Change stats summary */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: t('dialogs.mergeBranch.added'), count: diff?.added.length || 0, icon: Plus, color: 'success' },
                      { label: t('dialogs.mergeBranch.modified'), count: diff?.modified.length || 0, icon: Edit3, color: 'primary' },
                      { label: t('dialogs.mergeBranch.deleted'), count: diff?.deleted.length || 0, icon: Minus, color: 'destructive' },
                      { label: t('dialogs.mergeBranch.conflicts'), count: diff?.conflicts.length || 0, icon: AlertTriangle, color: 'warning' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={cn(
                          'flex flex-col items-center p-3 rounded-xl border transition-all',
                          stat.count > 0
                            ? stat.color === 'success'
                              ? 'bg-success/5 border-success/20'
                              : stat.color === 'primary'
                              ? 'bg-primary/5 border-primary/20'
                              : stat.color === 'destructive'
                              ? 'bg-destructive/5 border-destructive/20'
                              : 'bg-warning/5 border-warning/20'
                            : 'bg-muted/30 border-transparent'
                        )}
                      >
                        <stat.icon
                          className={cn(
                            'size-4 mb-1',
                            stat.count > 0
                              ? stat.color === 'success'
                                ? 'text-success'
                                : stat.color === 'primary'
                                ? 'text-primary'
                                : stat.color === 'destructive'
                                ? 'text-destructive'
                                : 'text-warning'
                              : 'text-muted-foreground/40'
                          )}
                        />
                        <span className="text-lg font-semibold">{stat.count}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Change list */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-xl border bg-muted/20 p-2">
                    {diff?.added.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10"
                      >
                        <Plus className="size-3.5 text-success shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{entry.key}</span>
                        <span className="text-[10px] font-medium text-success uppercase">{t('dialogs.mergeBranch.added')}</span>
                      </div>
                    ))}
                    {diff?.modified.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10"
                      >
                        <Edit3 className="size-3.5 text-primary shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{entry.key}</span>
                        <span className="text-[10px] font-medium text-primary uppercase">{t('dialogs.mergeBranch.modified')}</span>
                      </div>
                    ))}
                    {diff?.deleted.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10"
                      >
                        <Minus className="size-3.5 text-destructive shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{entry.key}</span>
                        <span className="text-[10px] font-medium text-destructive uppercase">{t('dialogs.mergeBranch.deleted')}</span>
                      </div>
                    ))}
                    {diff?.conflicts.map((conflict) => (
                      <div
                        key={conflict.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10"
                      >
                        <AlertTriangle className="size-3.5 text-warning shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{conflict.key}</span>
                        <span className="text-[10px] font-medium text-warning uppercase">{t('dialogs.mergeBranch.conflict')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('select')}
                className="h-11 flex-1 sm:flex-none"
              >
                {t('common.back')}
              </Button>
              <Button
                onClick={handleMerge}
                disabled={mergeMutation.isPending || (!hasChanges && !hasConflicts)}
                className={cn(
                  'h-11 gap-2 flex-1 sm:flex-none',
                  hasConflicts && 'bg-warning hover:bg-warning/90 text-warning-foreground'
                )}
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('dialogs.mergeBranch.merging')}
                  </>
                ) : hasConflicts ? (
                  <>
                    <AlertTriangle className="size-4" />
                    {t('dialogs.mergeBranch.reviewConflicts')}
                  </>
                ) : (
                  <>
                    <GitMerge className="size-4" />
                    {t('dialogs.mergeBranch.mergeChanges')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Resolve conflicts */}
        {step === 'conflicts' && (
          <div className="px-6 pb-6">
            <div className="space-y-4 pt-2">
              {/* Warning banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
                <div className="size-9 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-4 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {t('dialogs.mergeBranch.conflictsCount', { count: mergeMutation.data?.conflicts?.length || 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('dialogs.mergeBranch.chooseVersion')}
                  </p>
                </div>
              </div>

              {/* Conflict list */}
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {mergeMutation.data?.conflicts?.map((conflict: ConflictEntry, index: number) => {
                  const resolution = resolutions.find((r) => r.key === conflict.key);
                  const isResolved = !!resolution;

                  return (
                    <div
                      key={conflict.key}
                      className={cn(
                        'rounded-xl border-2 overflow-hidden transition-all',
                        isResolved
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-card'
                      )}
                    >
                      {/* Conflict header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                          <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          <code className="text-sm font-semibold">{conflict.key}</code>
                        </div>
                        {isResolved && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                            <Check className="size-3.5" />
                            {t('dialogs.mergeBranch.resolved')}
                          </div>
                        )}
                      </div>

                      {/* Side by side options */}
                      <div className="grid grid-cols-2 divide-x">
                        {/* Source option */}
                        <button
                          onClick={() => handleResolveConflict(conflict.key, 'source')}
                          className={cn(
                            'p-3 text-left transition-all hover:bg-muted/30 relative group',
                            resolution?.resolution === 'source' && 'bg-primary/10 hover:bg-primary/15'
                          )}
                        >
                          {resolution?.resolution === 'source' && (
                            <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="size-3 text-primary-foreground" />
                            </div>
                          )}
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <GitBranch className="size-3" />
                            {sourceBranch?.name}
                          </p>
                          <div className="space-y-1">
                            {Object.entries(conflict.source).map(([lang, value]) => (
                              <div key={lang} className="flex gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground uppercase w-6 shrink-0">{lang}</span>
                                <span className="font-mono truncate bg-muted/50 px-1.5 py-0.5 rounded flex-1">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </button>

                        {/* Target option */}
                        <button
                          onClick={() => handleResolveConflict(conflict.key, 'target')}
                          className={cn(
                            'p-3 text-left transition-all hover:bg-muted/30 relative group',
                            resolution?.resolution === 'target' && 'bg-primary/10 hover:bg-primary/15'
                          )}
                        >
                          {resolution?.resolution === 'target' && (
                            <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="size-3 text-primary-foreground" />
                            </div>
                          )}
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <GitBranch className="size-3" />
                            {targetBranch?.name}
                          </p>
                          <div className="space-y-1">
                            {Object.entries(conflict.target).map(([lang, value]) => (
                              <div key={lang} className="flex gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground uppercase w-6 shrink-0">{lang}</span>
                                <span className="font-mono truncate bg-muted/50 px-1.5 py-0.5 rounded flex-1">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress indicator */}
              <div className="flex items-center justify-between py-2 border-t">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{resolutions.length}</span>
                  {' / '}
                  <span className="font-semibold text-foreground">{mergeMutation.data?.conflicts?.length || 0}</span>
                  {' '}{t('dialogs.mergeBranch.resolved')}
                </div>
                {/* Progress bar */}
                <div className="flex-1 mx-4 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${((resolutions.length / (mergeMutation.data?.conflicts?.length || 1)) * 100)}%`
                    }}
                  />
                </div>
                {allConflictsResolved && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                    <Check className="size-3.5" />
                    {t('dialogs.mergeBranch.ready')}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('preview')}
                className="h-11 flex-1 sm:flex-none"
              >
                {t('common.back')}
              </Button>
              <Button
                onClick={handleMerge}
                disabled={mergeMutation.isPending || !allConflictsResolved}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('dialogs.mergeBranch.merging')}
                  </>
                ) : (
                  <>
                    <GitMerge className="size-4" />
                    {t('dialogs.mergeBranch.completeMerge')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
