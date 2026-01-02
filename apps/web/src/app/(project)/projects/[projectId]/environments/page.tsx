'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslation } from '@lingx/sdk-nextjs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Globe,
  GitBranch,
  Trash2,
  Cloud,
  Loader2,
  Sparkles,
  Code,
  ExternalLink,
  Star,
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
import { cn } from '@/lib/utils';

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
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-10 rounded-xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Cloud className="size-5 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('environments.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="island p-6 text-center border-destructive/30">
        <p className="text-destructive">{t('environments.loadError')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild aria-label={t('common.goBack')}>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold sm:text-3xl tracking-tight">{t('environments.title')}</h1>
              {environments.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {environments.length}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
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
        <div className="island p-12 text-center animate-fade-in-up stagger-1">
          <div className="relative mb-6 mx-auto w-fit">
            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Globe className="size-10 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 size-8 rounded-lg bg-warm/20 flex items-center justify-center border-2 border-card">
              <Sparkles className="size-4 text-warm" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('environments.empty.title')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
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
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Environment Cards */}
          <div className="lg:col-span-8 space-y-4">
            {environments.map((env, index) => (
              <div
                key={env.id}
                className={cn(
                  'island p-5 card-hover animate-fade-in-up',
                  `stagger-${Math.min(index + 1, 6)}`
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Cloud className="size-6 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{env.name}</h3>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {env.slug}
                      </span>
                    </div>

                    {/* Branch info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GitBranch className="size-4 shrink-0" />
                      <span>{env.branch.space.name}</span>
                      <span className="text-muted-foreground/50">/</span>
                      <span className="font-medium text-foreground">{env.branch.name}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
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
          <div className="lg:col-span-4 space-y-4">
            {/* SDK Integration */}
            <div className="island p-5 animate-fade-in-up stagger-2">
              <div className="flex items-center gap-2 mb-4">
                <Code className="size-5 text-primary" />
                <h3 className="font-semibold">{t('environments.sdkIntegration.title')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('environments.sdkIntegration.description')}
              </p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                <span className="text-muted-foreground">{'// Initialize SDK'}</span>
                <br />
                <span className="text-primary">lingx</span>.init(&#123;
                <br />
                &nbsp;&nbsp;env: <span className="text-warm">&apos;{environments[0]?.slug || 'prod'}&apos;</span>
                <br />
                &#125;);
              </div>
            </div>

            {/* Tips */}
            <div className="island p-5 animate-fade-in-up stagger-3">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-warm" />
                <h3 className="font-semibold">{t('environments.tips.title')}</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Star className="size-4 shrink-0 mt-0.5 text-warning" />
                  <span>{t('environments.tips.separate')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="size-4 shrink-0 mt-0.5 text-warning" />
                  <span>{t('environments.tips.branches')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="size-4 shrink-0 mt-0.5 text-warning" />
                  <span>{t('environments.tips.updateTime')}</span>
                </li>
              </ul>
            </div>

            {/* Docs Link */}
            <a
              href="#"
              className="island p-4 flex items-center gap-3 card-hover animate-fade-in-up stagger-4"
            >
              <div className="size-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <ExternalLink className="size-5 text-info" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{t('environments.docsLink.title')}</p>
                <p className="text-xs text-muted-foreground">{t('environments.docsLink.description')}</p>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* Switch Branch Dialog */}
      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <DialogHeader className="gap-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                  <GitBranch className="size-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    {t('environments.switchBranch')}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {t('environments.switchBranchDialog.description', { name: switchingEnv?.name || '' })}
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
                          <GitBranch className="size-4 text-muted-foreground" />
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
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-4 text-info" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">{t('environments.switchBranchDialog.quickUpdate')}</p>
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
                className="h-11 gap-2 flex-1 sm:flex-none"
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
              className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
