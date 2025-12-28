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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={`/projects/${projectId}/spaces/${spaceId}/branches/${branchId}/diff`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="text-sm text-muted-foreground">
              {project?.name} / {sourceBranch?.space?.name}
            </div>
            <h1 className="text-3xl font-bold">Branch Comparison</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          {diff && totalChanges > 0 && (
            <Button
              onClick={() => setMergeDialogOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
            >
              <GitMerge className="h-4 w-4 mr-2" />
              Merge Branch
              {hasConflicts && (
                <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                  {diff.conflicts.length} conflicts
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Branch comparison header */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-indigo-50 via-purple-50 to-violet-50 border border-indigo-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-xs text-indigo-600 uppercase tracking-wide">
              Source
            </div>
            <div className="font-mono font-semibold text-indigo-800">
              {sourceBranch?.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4">
          <ArrowRight className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-500">merging into</span>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="text-right">
            <div className="text-xs text-violet-600 uppercase tracking-wide">
              Target
            </div>
            <div className="font-mono font-semibold text-violet-800">
              {targetBranch?.name}
              {targetBranch?.isDefault && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-600 font-normal">
                  default
                </span>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-violet-600" />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-slate-500">Computing differences...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {diffError && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Failed to Load Differences
          </h3>
          <p className="text-slate-500 mb-4">
            {diffError instanceof ApiError
              ? diffError.message
              : 'An error occurred while computing the diff.'}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
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
