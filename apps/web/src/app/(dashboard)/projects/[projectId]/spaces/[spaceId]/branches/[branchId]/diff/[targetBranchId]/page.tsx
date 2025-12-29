'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { branchApi, projectApi, ApiError } from '@/lib/api';
import type { Resolution } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  GitMerge,
  RefreshCw,
  GitBranch,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { DiffView, MergeDialog } from '@/components/branch';

interface PageProps {
  params: Promise<{
    projectId: string;
    spaceId: string;
    branchId: string;
    targetBranchId: string;
  }>;
}

export default function BranchDiffPage({ params }: PageProps) {
  const { projectId, spaceId, branchId, targetBranchId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeError, setMergeError] = useState<string | undefined>();

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  // Fetch source branch
  const { data: sourceBranch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchApi.get(branchId),
  });

  // Fetch target branch
  const { data: targetBranch } = useQuery({
    queryKey: ['branch', targetBranchId],
    queryFn: () => branchApi.get(targetBranchId),
  });

  // Fetch diff
  const {
    data: diff,
    isLoading,
    error: diffError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['branch-diff', branchId, targetBranchId],
    queryFn: () => branchApi.diff(branchId, targetBranchId),
  });

  // Merge mutation
  const mergeMutation = useMutation({
    mutationFn: (resolutions: Resolution[]) =>
      branchApi.merge(branchId, {
        targetBranchId,
        resolutions: resolutions.length > 0 ? resolutions : undefined,
      }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['branch', targetBranchId] });
        queryClient.invalidateQueries({ queryKey: ['branches', spaceId] });
        queryClient.invalidateQueries({
          queryKey: ['branch-diff', branchId, targetBranchId],
        });
        toast.success('Merge successful', {
          description: `${result.merged} changes have been merged into ${targetBranch?.name}.`,
        });
        setMergeDialogOpen(false);
        router.push(
          `/projects/${projectId}/spaces/${spaceId}/branches/${targetBranchId}`
        );
      } else if (result.conflicts) {
        setMergeError(
          `Merge has unresolved conflicts. Please resolve all ${result.conflicts.length} conflicts.`
        );
      }
    },
    onError: (error: ApiError) => {
      setMergeError(error.message);
      toast.error('Merge failed', {
        description: error.message,
      });
    },
  });

  const handleMerge = async (resolutions: Resolution[]) => {
    setMergeError(undefined);
    await mergeMutation.mutateAsync(resolutions);
  };

  const hasConflicts = diff && diff.conflicts.length > 0;
  const totalChanges = diff
    ? diff.added.length + diff.modified.length + diff.deleted.length
    : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Stacked on mobile, inline on desktop */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 touch-manipulation" asChild aria-label="Go back to branch selection">
            <Link
              href={`/projects/${projectId}/spaces/${spaceId}/branches/${branchId}/diff`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="text-xs md:text-sm text-muted-foreground truncate">
              {project?.name} / {sourceBranch?.space?.name}
            </div>
            <h1 className="text-xl md:text-3xl font-bold truncate">Branch Comparison</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 ml-0 md:ml-auto">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 touch-manipulation flex-1 md:flex-none"
          >
            <RefreshCw
              className={`h-4 w-4 ${!isMobile && 'mr-2'} ${isFetching ? 'animate-spin' : ''}`}
            />
            {!isMobile && 'Refresh'}
          </Button>
          {diff && totalChanges > 0 && (
            <Button
              onClick={() => setMergeDialogOpen(true)}
              className="h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white touch-manipulation flex-1 md:flex-none"
            >
              <GitMerge className="h-4 w-4 mr-2" />
              {isMobile ? 'Merge' : 'Merge Branch'}
              {hasConflicts && (
                <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
                  {diff.conflicts.length}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Branch comparison header - Stacked on mobile, inline on desktop */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-gradient-to-r from-indigo-50 via-purple-50 to-violet-50 border border-indigo-200">
        {/* Source branch */}
        <div className="flex items-center gap-2 md:gap-3 flex-1">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <GitBranch className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-indigo-600 uppercase tracking-wide">
              Source
            </div>
            <div className="font-mono font-semibold text-indigo-800 text-sm md:text-base truncate">
              {sourceBranch?.name}
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex items-center gap-2 px-2 md:px-4">
          {isMobile ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <span>merging into</span>
            </div>
          ) : (
            <>
              <ArrowRight className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-500">merging into</span>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </>
          )}
        </div>

        {/* Target branch */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 md:justify-end">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0 md:order-last">
            <GitBranch className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-600" />
          </div>
          <div className="min-w-0 md:text-right">
            <div className="text-xs text-violet-600 uppercase tracking-wide">
              Target
            </div>
            <div className="font-mono font-semibold text-violet-800 text-sm md:text-base truncate flex items-center gap-2 md:justify-end">
              <span className="truncate">{targetBranch?.name}</span>
              {targetBranch?.isDefault && (
                <span className="px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-600 font-normal shrink-0">
                  default
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 md:py-16">
          <div className="flex flex-col items-center gap-3 md:gap-4">
            <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-indigo-500" />
            <p className="text-slate-500 text-sm md:text-base">Computing differences...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {diffError && (
        <div className="flex flex-col items-center justify-center py-12 md:py-16">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 md:h-8 md:w-8 text-rose-500" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
            Failed to Load Differences
          </h3>
          <p className="text-slate-500 mb-4 text-sm md:text-base text-center px-4">
            {diffError instanceof ApiError
              ? diffError.message
              : 'An error occurred while computing the diff.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="h-11 touch-manipulation">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Diff content */}
      {diff && <DiffView diff={diff} />}

      {/* Merge dialog */}
      {diff && (
        <MergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          diff={diff}
          onMerge={handleMerge}
          merging={mergeMutation.isPending}
          mergeError={mergeError}
        />
      )}
    </div>
  );
}
