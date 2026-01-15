'use client';

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
import { Button } from '@/components/ui/button';
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
import { ApiError, branchApi, Environment, environmentApi, projectApi, spaceApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Cloud,
  Code,
  ExternalLink,
  GitBranch,
  Globe,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';

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
  const { t } = useTranslation();
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

  const { data: allBranches } = useQuery({
    queryKey: ['all-branches', projectId],
    queryFn: async (): Promise<BranchWithSpace[]> => {
      if (!spacesData?.spaces) return [];
      const branches = await Promise.all(spacesData.spaces.map((s) => branchApi.list(s.id)));
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
      toast.success(t('environments.toasts.branchSwitched'), {
        description: t('environments.toasts.branchSwitchedDescription'),
      });
      setSwitchDialogOpen(false);
      setSwitchingEnv(null);
    },
    onError: (error: ApiError) => {
      toast.error(t('environments.toasts.branchSwitchFailed'), {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => environmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] });
      toast.success(t('environments.toasts.environmentDeleted'), {
        description: t('environments.toasts.environmentDeletedDescription'),
      });
      setDeleteDialogOpen(false);
      setDeletingEnv(null);
    },
    onError: (error: ApiError) => {
      toast.error(t('environments.toasts.environmentDeleteFailed'), {
        description: error.message,
      });
    },
  });

  const environments = data?.environments || [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="bg-primary/10 size-10 animate-pulse rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Cloud className="text-primary size-5 animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">{t('environments.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="island border-destructive/30 p-6 text-center">
        <p className="text-destructive">{t('environments.loadError')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild aria-label={t('common.goBack')}>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t('environments.title')}
              </h1>
              {environments.length > 0 && (
                <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium">
                  {environments.length}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {project?.name} - {t('environments.subtitle')}
            </p>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/projects/${projectId}/environments/new`}>
            <Plus className="size-4" />
            {t('environments.newEnvironment')}
          </Link>
        </Button>
      </div>

      {environments.length === 0 ? (
        <div className="island animate-fade-in-up stagger-1 p-12 text-center">
          <div className="relative mx-auto mb-6 w-fit">
            <div className="bg-primary/10 flex size-20 items-center justify-center rounded-2xl">
              <Globe className="text-primary size-10" />
            </div>
            <div className="bg-warm/20 border-card absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-lg border-2">
              <Sparkles className="text-warm size-4" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold">{t('environments.empty.title')}</h3>
          <p className="text-muted-foreground mx-auto mb-6 max-w-md">
            {t('environments.empty.description')}
          </p>
          <Button asChild className="gap-2">
            <Link href={`/projects/${projectId}/environments/new`}>
              <Plus className="size-4" />
              {t('environments.empty.createFirst')}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Environment Cards */}
          <div className="space-y-4 lg:col-span-8">
            {environments.map((env, index) => (
              <div
                key={env.id}
                className={cn(
                  'island card-hover animate-fade-in-up p-5',
                  `stagger-${Math.min(index + 1, 6)}`
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl">
                    <Cloud className="text-primary size-6" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{env.name}</h3>
                      <span className="text-muted-foreground bg-muted rounded px-2 py-0.5 font-mono text-xs">
                        {env.slug}
                      </span>
                    </div>

                    {/* Branch info */}
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <GitBranch className="size-4 shrink-0" />
                      <span>{env.branch.space.name}</span>
                      <span className="text-muted-foreground/50">/</span>
                      <span className="text-foreground font-medium">{env.branch.name}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSwitchingEnv(env);
                        setSelectedBranchId(env.branchId);
                        setSwitchDialogOpen(true);
                      }}
                    >
                      <GitBranch className="size-4" />
                      {t('environments.switchBranch')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setDeletingEnv(env);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4 lg:col-span-4">
            {/* SDK Integration */}
            <div className="island animate-fade-in-up stagger-2 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Code className="text-primary size-5" />
                <h3 className="font-semibold">{t('environments.sdkIntegration.title')}</h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                {t('environments.sdkIntegration.description')}
              </p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                <span className="text-muted-foreground">{'// Initialize SDK'}</span>
                <br />
                <span className="text-primary">lingx</span>.init(&#123;
                <br />
                &nbsp;&nbsp;env:{' '}
                <span className="text-warm">&apos;{environments[0]?.slug || 'prod'}&apos;</span>
                <br />
                &#125;);
              </div>
            </div>

            {/* Tips */}
            <div className="island animate-fade-in-up stagger-3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="text-warm size-5" />
                <h3 className="font-semibold">{t('environments.tips.title')}</h3>
              </div>
              <ul className="text-muted-foreground space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Star className="text-warning mt-0.5 size-4 shrink-0" />
                  <span>{t('environments.tips.separate')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="text-warning mt-0.5 size-4 shrink-0" />
                  <span>{t('environments.tips.branches')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="text-warning mt-0.5 size-4 shrink-0" />
                  <span>{t('environments.tips.updateTime')}</span>
                </li>
              </ul>
            </div>

            {/* Docs Link */}
            <a
              href="#"
              className="island card-hover animate-fade-in-up stagger-4 flex items-center gap-3 p-4"
            >
              <div className="bg-info/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                <ExternalLink className="text-info size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('environments.docsLink.title')}</p>
                <p className="text-muted-foreground text-xs">
                  {t('environments.docsLink.description')}
                </p>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* Switch Branch Dialog */}
      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
          {/* Header with gradient background */}
          <div className="from-primary/10 via-primary/5 bg-linear-to-br to-transparent px-6 pt-6 pb-4">
            <DialogHeader className="gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 border-primary/20 flex size-12 items-center justify-center rounded-xl border">
                  <GitBranch className="text-primary size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    {t('environments.switchBranch')}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {t('environments.switchBranchDialog.description', {
                      name: switchingEnv?.name || '',
                    })}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.branch')}</label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('environments.switchBranchDialog.selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allBranches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <GitBranch className="text-muted-foreground size-4" />
                          <span>{branch.spaceName}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-medium">{branch.name}</span>
                          {branch.isDefault && (
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info note */}
              <div className="bg-muted/30 border-border/50 flex items-start gap-3 rounded-xl border p-3">
                <div className="bg-info/10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Sparkles className="text-info size-4" />
                </div>
                <div className="text-muted-foreground text-xs">
                  <p className="text-foreground mb-0.5 font-medium">
                    {t('environments.switchBranchDialog.quickUpdate')}
                  </p>
                  <p>{t('environments.switchBranchDialog.updateNote')}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSwitchDialogOpen(false);
                  setSwitchingEnv(null);
                }}
                className="h-11 flex-1 sm:flex-none"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() =>
                  switchBranchMutation.mutate({
                    envId: switchingEnv!.id,
                    branchId: selectedBranchId,
                  })
                }
                disabled={switchBranchMutation.isPending}
                className="h-11 flex-1 gap-2 sm:flex-none"
              >
                {switchBranchMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('common.switching')}
                  </>
                ) : (
                  <>
                    <GitBranch className="size-4" />
                    {t('environments.switchBranch')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.deleteConfirm.deleteEnvironment')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('environments.deleteDialog.description', { name: deletingEnv?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-11"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingEnv(null);
              }}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEnv && deleteMutation.mutate(deletingEnv.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
