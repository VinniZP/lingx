'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBranchSchema, type CreateBranchInput } from '@lingx/shared';
import { useTranslation } from '@lingx/sdk-nextjs';
import { branchApi, ApiError, ProjectTreeBranch } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { GitBranch, Loader2, Copy, Star } from 'lucide-react';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  spaceId: string;
  spaceName: string;
  branches: ProjectTreeBranch[];
}

/**
 * Generates a URL-safe slug from a branch name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * CreateBranchDialog - Premium dialog for creating a new branch
 *
 * Uses react-hook-form + zod validation matching project form patterns.
 * Features gradient header, source branch selection, and slug preview.
 */
export function CreateBranchDialog({
  open,
  onOpenChange,
  projectId,
  spaceId,
  spaceName,
  branches,
}: CreateBranchDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CreateBranchInput>({
    resolver: zodResolver(createBranchSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      fromBranchId: '',
    },
  });

  const branchName = form.watch('name');
  const fromBranchId = form.watch('fromBranchId');
  const selectedSourceBranch = branches.find((b) => b.id === fromBranchId);

  // Reset form and set default source branch when dialog opens
  useEffect(() => {
    if (open) {
      const defaultBranch = branches.find((b) => b.isDefault);
      form.reset({
        name: '',
        fromBranchId: defaultBranch?.id || branches[0]?.id || '',
      });
    }
  }, [open, branches, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateBranchInput) => branchApi.create(spaceId, data),
    onSuccess: (newBranch, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
      const sourceName = branches.find((b) => b.id === variables.fromBranchId)?.name || 'source';
      toast.success(t('dialogs.createBranch.created'), {
        description: t('dialogs.createBranch.createdDescription', { name: variables.name, source: sourceName }),
      });
      onOpenChange(false);
      router.push(`/projects/${projectId}/translations/${newBranch.id}`);
    },
    onError: (error: ApiError) => {
      if (!handleApiFieldErrors(error, form.setError)) {
        toast.error(t('dialogs.createBranch.createFailed'), {
          description: error.message,
        });
      }
    },
  });

  const onSubmit = (data: CreateBranchInput) => {
    createMutation.mutate({
      name: generateSlug(data.name),
      fromBranchId: data.fromBranchId,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                  {t('dialogs.createBranch.title')}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t('dialogs.createBranch.description', { spaceName })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6">
            <div className="space-y-4">
              {/* Branch Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.createBranch.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('dialogs.createBranch.namePlaceholder')}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('dialogs.createBranch.willBeCreatedAs')} <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{branchName ? generateSlug(branchName) : 'branch-name'}</code>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source Branch */}
              <FormField
                control={form.control}
                name="fromBranchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.createBranch.copyFrom')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialogs.createBranch.selectSource')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center gap-2">
                              <GitBranch className="size-4 text-muted-foreground" />
                              <span>{branch.name}</span>
                              {branch.isDefault && (
                                <Star className="size-3 fill-amber-400 text-amber-400" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                ({t('common.keys', { count: branch.keyCount })})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('dialogs.createBranch.copyNote')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Info note */}
              {selectedSourceBranch && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Copy className="size-4 text-info" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-0.5">
                      {t('dialogs.createBranch.copyingKeys', { count: selectedSourceBranch.keyCount })}
                    </p>
                    <p>
                      {t('dialogs.createBranch.isolationNote', { branchName: selectedSourceBranch.name })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="h-11 flex-1 sm:flex-none"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !form.formState.isValid}
                className="h-11 gap-2 flex-1 sm:flex-none"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <GitBranch className="size-4" />
                    {t('common.create')} {t('dialogs.createBranch.title')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
