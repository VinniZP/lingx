'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  branchApi,
  ApiError,
  ProjectTreeBranch,
  ConflictEntry,
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

const steps: { key: StepType; label: string }[] = [
  { key: 'select', label: 'Select' },
  { key: 'preview', label: 'Preview' },
  { key: 'conflicts', label: 'Resolve' },
];

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
  const queryClient = useQueryClient();

  const [targetBranchId, setTargetBranchId] = useState('');
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [step, setStep] = useState<StepType>('select');

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
        toast.success('Branches merged', {
          description: `Successfully merged ${result.merged} changes into ${targetBranches.find((b) => b.id === targetBranchId)?.name || 'target branch'}.`,
        });
        onOpenChange(false);
      } else if (result.conflicts && result.conflicts.length > 0) {
        setStep('conflicts');
        toast.warning('Conflicts detected', {
          description: `${result.conflicts.length} conflict(s) need to be resolved before merging.`,
        });
      }
    },
    onError: (error: ApiError) => {
      toast.error('Failed to merge branches', {
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
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <GitMerge className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Merge Branch
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Merge changes from "{sourceBranch?.name}" into another branch
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
                    Source Branch
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
                        {sourceBranch?.keyCount} translation keys
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
                    Target Branch
                  </Label>
                  <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                    <SelectTrigger size="auto" className="py-3 px-3 rounded-xl [&>span]:flex-1">
                      <SelectValue placeholder="Select target branch">
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
                                {targetBranch.keyCount} translation keys
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
                              {branch.keyCount} keys
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
                  <p className="font-medium text-foreground mb-0.5">How merging works</p>
                  <p>All translation keys and values from the source will be applied to the target branch. Conflicts will be shown for manual resolution.</p>
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
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!targetBranchId}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                Preview Changes
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
                  <p className="text-sm text-muted-foreground">Comparing branches...</p>
                </div>
              ) : diffError ? (
                <div className="text-center py-12">
                  <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="size-5 text-destructive" />
                  </div>
                  <p className="text-sm text-destructive font-medium">Failed to load diff</p>
                  <p className="text-xs text-muted-foreground mt-1">Please try again</p>
                </div>
              ) : !hasChanges && !hasConflicts ? (
                <div className="text-center py-12">
                  <div className="size-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="size-7 text-success" />
                  </div>
                  <p className="font-semibold text-lg mb-1">Branches are in sync</p>
                  <p className="text-sm text-muted-foreground">
                    No changes to merge between these branches
                  </p>
                </div>
              ) : (
                <>
                  {/* Change stats summary */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Added', count: diff?.added.length || 0, icon: Plus, color: 'success' },
                      { label: 'Modified', count: diff?.modified.length || 0, icon: Edit3, color: 'primary' },
                      { label: 'Deleted', count: diff?.deleted.length || 0, icon: Minus, color: 'destructive' },
                      { label: 'Conflicts', count: diff?.conflicts.length || 0, icon: AlertTriangle, color: 'warning' },
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
                        <span className="text-[10px] font-medium text-success uppercase">Added</span>
                      </div>
                    ))}
                    {diff?.modified.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10"
                      >
                        <Edit3 className="size-3.5 text-primary shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{entry.key}</span>
                        <span className="text-[10px] font-medium text-primary uppercase">Modified</span>
                      </div>
                    ))}
                    {diff?.deleted.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10"
                      >
                        <Minus className="size-3.5 text-destructive shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{entry.key}</span>
                        <span className="text-[10px] font-medium text-destructive uppercase">Deleted</span>
                      </div>
                    ))}
                    {diff?.conflicts.map((conflict) => (
                      <div
                        key={conflict.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10"
                      >
                        <AlertTriangle className="size-3.5 text-warning shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{conflict.key}</span>
                        <span className="text-[10px] font-medium text-warning uppercase">Conflict</span>
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
                Back
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
                    Merging...
                  </>
                ) : hasConflicts ? (
                  <>
                    <AlertTriangle className="size-4" />
                    Review Conflicts
                  </>
                ) : (
                  <>
                    <GitMerge className="size-4" />
                    Merge Changes
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
                    {mergeMutation.data?.conflicts?.length} conflict{(mergeMutation.data?.conflicts?.length || 0) !== 1 ? 's' : ''} detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose which version to keep for each conflicting translation key
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
                            Resolved
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
                  {' resolved'}
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
                    Ready
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
                Back
              </Button>
              <Button
                onClick={handleMerge}
                disabled={mergeMutation.isPending || !allConflictsResolved}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge className="size-4" />
                    Complete Merge
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
