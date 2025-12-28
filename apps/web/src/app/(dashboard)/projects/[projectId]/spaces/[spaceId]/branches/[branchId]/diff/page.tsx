'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { branchApi, projectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, GitCompare, GitBranch, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    projectId: string;
    spaceId: string;
    branchId: string;
  }>;
}

export default function BranchDiffSelectPage({ params }: PageProps) {
  const { projectId, spaceId, branchId } = use(params);
  const router = useRouter();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchApi.get(branchId),
  });

  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', spaceId],
    queryFn: () => branchApi.list(spaceId),
  });

  const otherBranches =
    branchesData?.branches.filter((b) => b.id !== branchId) || [];
  const isLoading = branchLoading || branchesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/projects/${projectId}/spaces/${spaceId}/branches/${branchId}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            {project?.name} / {branch?.space?.name}
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <GitCompare className="h-5 w-5 text-white" />
            </span>
            <span>Compare Branch</span>
          </h1>
        </div>
      </div>

      {/* Current branch info */}
      {branch && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-indigo-600" />
            <div>
              <span className="text-sm text-indigo-600">Comparing from:</span>
              <span className="font-mono font-semibold text-indigo-800 ml-2">
                {branch.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* No other branches */}
      {!isLoading && otherBranches.length === 0 && (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <GitCompare className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No Other Branches
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Create another branch in this space to compare changes between
              branches.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link
                href={`/projects/${projectId}/spaces/${spaceId}/branches/new`}
              >
                Create Branch
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Branch selection grid */}
      {!isLoading && otherBranches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">
            Select Target Branch
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherBranches.map((targetBranch) => (
              <Card
                key={targetBranch.id}
                className="group cursor-pointer border-2 border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all duration-200"
                onClick={() =>
                  router.push(
                    `/projects/${projectId}/spaces/${spaceId}/branches/${branchId}/diff/${targetBranch.id}`
                  )
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(
                      `/projects/${projectId}/spaces/${spaceId}/branches/${branchId}/diff/${targetBranch.id}`
                    );
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg group-hover:text-indigo-600 transition-colors">
                    <GitBranch className="h-5 w-5" />
                    {targetBranch.name}
                    {targetBranch.isDefault && (
                      <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-normal">
                        default
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {targetBranch.keyCount ?? 0} translation keys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-indigo-600 transition-colors">
                    <GitCompare className="h-4 w-4" />
                    <span>
                      Compare{' '}
                      <span className="font-mono">{branch?.name}</span> with{' '}
                      <span className="font-mono">{targetBranch.name}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
