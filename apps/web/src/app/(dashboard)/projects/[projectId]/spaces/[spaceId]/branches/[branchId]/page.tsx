'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { branchApi, projectApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, GitBranch, Key, Trash2, Edit, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PageProps {
  params: Promise<{ projectId: string; spaceId: string; branchId: string }>;
}

export default function BranchDetailPage({ params }: PageProps) {
  const { projectId, spaceId, branchId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchApi.get(branchId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => branchApi.delete(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', spaceId] });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
      toast.success('Branch deleted', {
        description: 'The branch has been deleted.',
      });
      router.push(`/projects/${projectId}/spaces/${spaceId}`);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to delete branch', {
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading branch...
        </div>
      </div>
    );
  }

  if (!branch) {
    return <div className="text-destructive">Branch not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}/spaces/${spaceId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            {project?.name} / {branch.space.name}
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            {branch.name}
            {branch.isDefault && (
              <span className="px-2 py-0.5 rounded text-sm bg-primary/10 text-primary">
                default
              </span>
            )}
          </h1>
        </div>
        {!branch.isDefault && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Branch?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{branch.name}&quot; and all
                  its translation keys. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Translation Keys</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{branch.keyCount ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Created</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-lg">
              {new Date(branch.createdAt).toLocaleDateString()}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Source Branch</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-lg">
              {branch.sourceBranchId ? 'Branched from parent' : 'Original'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Translations</CardTitle>
          <CardDescription>
            Manage translation keys in this branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button asChild>
              <Link
                href={`/projects/${projectId}/spaces/${spaceId}/branches/${branchId}/translations`}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Translations
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branch Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Operations</CardTitle>
          <CardDescription>
            Compare and merge branches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link
                href={`/projects/${projectId}/spaces/${spaceId}/branches/${branchId}/diff`}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Branches
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
