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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MergeBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sourceBranch: ProjectTreeBranch | null;
  allBranches: ProjectTreeBranch[];
}

/**
 * MergeBranchDialog - Dialog for merging one branch into another
 *
 * Shows a diff preview and handles conflict resolution.
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
  const [step, setStep] = useState<'select' | 'preview' | 'conflicts'>('select');

  // Get available target branches (exclude the source branch) - memoized to prevent infinite loops
  const targetBranches = useMemo(
    () => allBranches.filter((b) => b.id !== sourceBranch?.id),
    [allBranches, sourceBranch?.id]
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open && sourceBranch) {
      // Default to the default branch as target
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
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
        queryClient.invalidateQueries({ queryKey: ['keys'] });
        toast.success('Branches merged', {
          description: `Successfully merged ${result.merged} changes into ${targetBranches.find((b) => b.id === targetBranchId)?.name || 'target branch'}.`,
        });
        onOpenChange(false);
      } else if (result.conflicts && result.conflicts.length > 0) {
        // Handle conflicts - show conflict resolution step
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="size-5 text-primary" />
            Merge Branch
          </DialogTitle>
          <DialogDescription>
            Merge changes from "{sourceBranch?.name}" into another branch.
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <>
            <div className="space-y-4 py-4">
              {/* Source branch (read-only) */}
              <div className="space-y-2">
                <Label>Source Branch (merge from)</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border">
                  <GitBranch className="size-4 text-primary" />
                  <span className="font-medium">{sourceBranch?.name}</span>
                  {sourceBranch?.isDefault && (
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                  )}
                  <span className="text-muted-foreground text-xs ml-auto">
                    {sourceBranch?.keyCount} keys
                  </span>
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="size-4" />
                  <span className="text-xs">will be merged into</span>
                  <ArrowRight className="size-4" />
                </div>
              </div>

              {/* Target branch select */}
              <div className="space-y-2">
                <Label htmlFor="target-branch">Target Branch (merge into)</Label>
                <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                  <SelectTrigger id="target-branch">
                    <SelectValue placeholder="Select target branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <GitBranch className="size-4" />
                          <span>{branch.name}</span>
                          {branch.isDefault && (
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                          )}
                          <span className="text-muted-foreground text-xs">
                            ({branch.keyCount} keys)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Changes from the source will be applied to this branch
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!targetBranchId}>
                Preview Changes
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="space-y-4 py-4">
              {/* Branch summary */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="gap-1">
                  <GitBranch className="size-3" />
                  {sourceBranch?.name}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
                <Badge variant="outline" className="gap-1">
                  <GitBranch className="size-3" />
                  {targetBranch?.name}
                </Badge>
              </div>

              {/* Diff preview */}
              {diffLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : diffError ? (
                <div className="text-center py-8 text-destructive">
                  Failed to load diff. Please try again.
                </div>
              ) : !hasChanges && !hasConflicts ? (
                <div className="text-center py-8">
                  <Check className="size-8 mx-auto text-success mb-2" />
                  <p className="text-muted-foreground">
                    No changes to merge. Branches are in sync.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {/* Added keys */}
                  {diff?.added.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20"
                    >
                      <Plus className="size-4 text-success shrink-0" />
                      <span className="font-mono text-sm truncate">
                        {entry.key}
                      </span>
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs shrink-0"
                      >
                        Added
                      </Badge>
                    </div>
                  ))}

                  {/* Modified keys */}
                  {diff?.modified.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
                    >
                      <Edit3 className="size-4 text-primary shrink-0" />
                      <span className="font-mono text-sm truncate">
                        {entry.key}
                      </span>
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs shrink-0"
                      >
                        Modified
                      </Badge>
                    </div>
                  ))}

                  {/* Deleted keys */}
                  {diff?.deleted.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20"
                    >
                      <Minus className="size-4 text-destructive shrink-0" />
                      <span className="font-mono text-sm truncate">
                        {entry.key}
                      </span>
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs shrink-0"
                      >
                        Deleted
                      </Badge>
                    </div>
                  ))}

                  {/* Conflicts */}
                  {diff?.conflicts.map((conflict) => (
                    <div
                      key={conflict.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    >
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                      <span className="font-mono text-sm truncate">
                        {conflict.key}
                      </span>
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs shrink-0 bg-amber-500/20 text-amber-700"
                      >
                        Conflict
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {hasChanges && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                  {diff?.added.length ? (
                    <span className="flex items-center gap-1 text-success">
                      <Plus className="size-3" />
                      {diff.added.length} added
                    </span>
                  ) : null}
                  {diff?.modified.length ? (
                    <span className="flex items-center gap-1 text-primary">
                      <Edit3 className="size-3" />
                      {diff.modified.length} modified
                    </span>
                  ) : null}
                  {diff?.deleted.length ? (
                    <span className="flex items-center gap-1 text-destructive">
                      <Minus className="size-3" />
                      {diff.deleted.length} deleted
                    </span>
                  ) : null}
                  {hasConflicts && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="size-3" />
                      {diff?.conflicts.length} conflicts
                    </span>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleMerge}
                disabled={
                  mergeMutation.isPending ||
                  (!hasChanges && !hasConflicts)
                }
                className={cn(
                  hasConflicts &&
                    'bg-amber-500 hover:bg-amber-600 text-white'
                )}
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Merging...
                  </>
                ) : hasConflicts ? (
                  'Merge with Conflicts'
                ) : (
                  'Merge'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'conflicts' && (
          <>
            <div className="space-y-4 py-4">
              {/* Branch info reminder */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="gap-1 bg-primary/5">
                  <GitBranch className="size-3" />
                  {sourceBranch?.name}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
                <Badge variant="outline" className="gap-1 bg-primary/5">
                  <GitBranch className="size-3" />
                  {targetBranch?.name}
                </Badge>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                    {mergeMutation.data?.conflicts?.length} conflict{(mergeMutation.data?.conflicts?.length || 0) !== 1 ? 's' : ''} detected
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-0.5">
                    Choose which version to keep for each conflicting key.
                  </p>
                </div>
              </div>

              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {mergeMutation.data?.conflicts?.map((conflict: ConflictEntry) => {
                  const resolution = resolutions.find(
                    (r) => r.key === conflict.key
                  );
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
                      {/* Key header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-semibold bg-background px-2 py-0.5 rounded">
                            {conflict.key}
                          </code>
                        </div>
                        {isResolved && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                            <Check className="size-3.5" />
                            Resolved
                          </div>
                        )}
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-2 divide-x">
                        <button
                          onClick={() =>
                            handleResolveConflict(conflict.key, 'source')
                          }
                          className={cn(
                            'p-4 text-left transition-all hover:bg-muted/50 relative',
                            resolution?.resolution === 'source' &&
                              'bg-primary/10 hover:bg-primary/15'
                          )}
                        >
                          {resolution?.resolution === 'source' && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="size-3 text-primary-foreground" />
                            </div>
                          )}
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Source ({sourceBranch?.name})
                          </p>
                          <div className="font-mono text-sm bg-muted/80 rounded-lg p-2 break-all">
                            {Object.entries(conflict.source).map(([lang, value]) => (
                              <div key={lang} className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">{lang}:</span>
                                <span className="truncate">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </button>
                        <button
                          onClick={() =>
                            handleResolveConflict(conflict.key, 'target')
                          }
                          className={cn(
                            'p-4 text-left transition-all hover:bg-muted/50 relative',
                            resolution?.resolution === 'target' &&
                              'bg-primary/10 hover:bg-primary/15'
                          )}
                        >
                          {resolution?.resolution === 'target' && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="size-3 text-primary-foreground" />
                            </div>
                          )}
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Target ({targetBranch?.name})
                          </p>
                          <div className="font-mono text-sm bg-muted/80 rounded-lg p-2 break-all">
                            {Object.entries(conflict.target).map(([lang, value]) => (
                              <div key={lang} className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">{lang}:</span>
                                <span className="truncate">{String(value)}</span>
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
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{resolutions.length}</span>
                  {' '}of{' '}
                  <span className="font-semibold text-foreground">{mergeMutation.data?.conflicts?.length || 0}</span>
                  {' '}conflicts resolved
                </div>
                {allConflictsResolved && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-success">
                    <Check className="size-4" />
                    All resolved
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('preview')}>
                Back
              </Button>
              <Button
                onClick={handleMerge}
                disabled={mergeMutation.isPending || !allConflictsResolved}
                className="gap-2"
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
