'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  environmentApi,
  projectApi,
  spaceApi,
  branchApi,
  Environment,
  ApiError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Plus,
  Globe,
  GitBranch,
  Settings,
  Trash2,
  Zap,
  Cloud,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

interface BranchWithSpace {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  spaceName: string;
}

export default function EnvironmentsPage({ params }: PageProps) {
  const { projectId } = use(params);
  const queryClient = useQueryClient();

  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [switchingEnv, setSwitchingEnv] = useState<Environment | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEnv, setDeletingEnv] = useState<Environment | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => environmentApi.list(projectId),
  });

  const { data: spacesData } = useQuery({
    queryKey: ['spaces', projectId],
    queryFn: () => spaceApi.list(projectId),
  });

  // Get all branches from all spaces for branch switching
  const { data: allBranches } = useQuery({
    queryKey: ['all-branches', projectId],
    queryFn: async (): Promise<BranchWithSpace[]> => {
      if (!spacesData?.spaces) return [];
      const branches = await Promise.all(
        spacesData.spaces.map((s) => branchApi.list(s.id))
      );
      return branches.flatMap((b, i) =>
        b.branches.map((br) => ({
          ...br,
          spaceName: spacesData.spaces[i].name,
        }))
      );
    },
    enabled: !!spacesData?.spaces,
  });

  const switchBranchMutation = useMutation({
    mutationFn: ({ envId, branchId }: { envId: string; branchId: string }) =>
      environmentApi.switchBranch(envId, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] });
      toast.success('Branch switched', {
        description: 'SDK responses will update within 5 seconds.',
      });
      setSwitchDialogOpen(false);
      setSwitchingEnv(null);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to switch branch', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => environmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] });
      toast.success('Environment deleted', {
        description: 'The environment has been deleted.',
      });
      setDeleteDialogOpen(false);
      setDeletingEnv(null);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to delete environment', {
        description: error.message,
      });
    },
  });

  const environments = data?.environments || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading environments...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Failed to load environments. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-11 w-11 touch-manipulation">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">Environments</h1>
            <p className="text-muted-foreground mt-1">
              {project?.name} - Manage deployment environments
            </p>
          </div>
        </div>
        <Button asChild className="h-11 w-full sm:w-auto touch-manipulation gap-2">
          <Link href={`/projects/${projectId}/environments/new`}>
            <Plus className="h-4 w-4" />
            New Environment
          </Link>
        </Button>
      </div>

      {environments.length === 0 ? (
        <Card className="gradient-flow">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Globe className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-warm/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-warm" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">No environments yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Environments link your SDK to specific branches. Create
              environments like &quot;production&quot;, &quot;staging&quot;, or
              &quot;development&quot; to manage translation deployments.
            </p>
            <Button asChild size="lg" className="h-11 touch-manipulation gap-2">
              <Link href={`/projects/${projectId}/environments/new`}>
                <Plus className="h-4 w-4" />
                Create Your First Environment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {environments.map((env, index) => (
            <Card
              key={env.id}
              className="group touch-manipulation hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2.5 text-lg">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <Cloud className="h-4.5 w-4.5 text-primary" />
                      </div>
                      {env.name}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-1.5 ml-11.5">
                      {env.slug}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Branch info */}
                  <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted/50">
                    <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {env.branch.space.name}
                    </span>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="font-medium truncate">{env.branch.name}</span>
                  </div>

                  {/* Card actions */}
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      className="h-11 w-full sm:w-auto touch-manipulation gap-2"
                      onClick={() => {
                        setSwitchingEnv(env);
                        setSelectedBranchId(env.branchId);
                        setSwitchDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                      Switch Branch
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 w-full sm:w-auto touch-manipulation gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingEnv(env);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Switch Branch Dialog */}
      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Switch Branch
            </DialogTitle>
            <DialogDescription>
              Select a branch for the &quot;{switchingEnv?.name}&quot;
              environment. SDK responses will update within 5 seconds.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="branch" className="text-sm font-medium">
              Branch
            </Label>
            <select
              id="branch"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full mt-2 h-11 px-3 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {allBranches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.spaceName} / {branch.name}
                  {branch.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto touch-manipulation"
              onClick={() => {
                setSwitchDialogOpen(false);
                setSwitchingEnv(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                switchBranchMutation.mutate({
                  envId: switchingEnv!.id,
                  branchId: selectedBranchId,
                })
              }
              disabled={switchBranchMutation.isPending}
              className="h-11 w-full sm:w-auto touch-manipulation gap-2"
            >
              {switchBranchMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Switching...
                </>
              ) : (
                'Switch Branch'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Environment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the &quot;{deletingEnv?.name}&quot;
              environment. SDKs using this environment will stop receiving
              translations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingEnv(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEnv && deleteMutation.mutate(deletingEnv.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
