'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, branchApi, environmentApi, projectApi, spaceApi } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { createEnvironmentSchema, type CreateEnvironmentInput } from '@lingx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Code2,
  FlaskConical,
  GitBranch,
  Lightbulb,
  Plus,
  Rocket,
  Server,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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

export default function NewEnvironmentPage({ params }: PageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: spacesData } = useQuery({
    queryKey: ['spaces', projectId],
    queryFn: () => spaceApi.list(projectId),
  });

  // Get all branches from all spaces
  const { data: allBranches, isLoading: branchesLoading } = useQuery({
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

  const form = useForm<CreateEnvironmentInput>({
    resolver: zodResolver(createEnvironmentSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      slug: '',
      branchId: '',
    },
  });

  // Set default branch when branches load
  useEffect(() => {
    if (allBranches?.length && !form.getValues('branchId')) {
      const defaultBranch = allBranches.find((b) => b.isDefault) || allBranches[0];
      if (defaultBranch) {
        form.setValue('branchId', defaultBranch.id);
      }
    }
  }, [allBranches, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateEnvironmentInput) => environmentApi.create(projectId, data),
    onSuccess: (env) => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] });
      toast.success('Environment created', {
        description: `${env.name} is now ready for SDK integration.`,
      });
      router.push(`/projects/${projectId}/environments`);
    },
    onError: (error: ApiError) => {
      if (!handleApiFieldErrors(error, form.setError)) {
        toast.error('Failed to create environment', {
          description: error.message,
        });
      }
    },
  });

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    form.setValue('name', value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    form.setValue('slug', generatedSlug, { shouldValidate: form.formState.touchedFields.slug });
  };

  const onSubmit = (data: CreateEnvironmentInput) => {
    createMutation.mutate(data);
  };

  const selectedBranchId = useWatch({ control: form.control, name: 'branchId' });
  const selectedBranch = allBranches?.find((b) => b.id === selectedBranchId);
  const watchedName = useWatch({ control: form.control, name: 'name' });
  const watchedSlug = useWatch({ control: form.control, name: 'slug' });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="island animate-fade-in-up p-6 lg:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Icon */}
          <div className="relative shrink-0">
            <div className="from-warm/20 via-warm/10 to-primary/10 border-warm/20 flex size-16 items-center justify-center rounded-2xl border bg-linear-to-br">
              <Server className="text-warm size-7" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-3">
              <Link
                href={`/projects/${projectId}/environments`}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to environments"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">New Environment</h1>
            </div>
            <p className="text-muted-foreground">
              {project?.name ? (
                <>
                  Create a deployment target for{' '}
                  <span className="text-foreground font-medium">{project.name}</span>
                </>
              ) : (
                'Create a deployment target for your project'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Form - Left Column */}
        <div className="space-y-6 lg:col-span-7">
          {/* Form Island */}
          <div className="island animate-fade-in-up stagger-2 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-primary/10 flex size-10 items-center justify-center rounded-xl">
                <Sparkles className="text-primary size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Environment Details</h2>
                <p className="text-muted-foreground text-sm">
                  Configure how your SDK connects to translations
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('environments.form.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Production"
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>A descriptive name for this environment</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Slug Field */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('environments.form.slug')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="production" className="font-mono" />
                      </FormControl>
                      <FormDescription>
                        Used in SDK configuration to identify this environment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Branch Select */}
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('environments.form.sourceBranch')}</FormLabel>
                      {branchesLoading ? (
                        <Skeleton className="h-11 w-full rounded-xl" />
                      ) : allBranches && allBranches.length > 0 ? (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allBranches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                <div className="flex items-center gap-2">
                                  <GitBranch className="text-muted-foreground size-4" />
                                  <span>
                                    {branch.spaceName} / {branch.name}
                                  </span>
                                  {branch.isDefault && (
                                    <Star className="text-warning fill-warning size-3" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="bg-muted/50 text-muted-foreground flex h-11 items-center rounded-xl border px-4 text-sm">
                          No branches available. Create a space first.
                        </div>
                      )}
                      <FormDescription>
                        The branch this environment will serve translations from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview Card */}
                {watchedName && watchedSlug && selectedBranch && (
                  <div className="bg-muted/30 animate-fade-in space-y-3 rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Zap className="text-warm size-4" />
                      Configuration Preview
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-medium">{watchedName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Slug:</span>{' '}
                        <code className="text-primary font-mono">{watchedSlug}</code>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <GitBranch className="text-muted-foreground size-4" />
                        <span className="text-muted-foreground">Branch:</span>
                        <span className="font-medium">
                          {selectedBranch.spaceName} / {selectedBranch.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="h-11"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !allBranches?.length}
                    className="h-11 gap-2"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        Create Environment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6 lg:col-span-5">
          {/* Quick Presets */}
          <div className="animate-fade-in-up stagger-3 space-y-3">
            <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wider uppercase">
              Common Environments
            </h2>
            <div className="island divide-border divide-y">
              <EnvironmentPreset
                icon={Rocket}
                iconBg="bg-success/10"
                iconColor="text-success"
                name="Production"
                slug="production"
                description="Live user-facing environment"
                onSelect={() => {
                  handleNameChange('Production');
                }}
              />
              <EnvironmentPreset
                icon={FlaskConical}
                iconBg="bg-warning/10"
                iconColor="text-warning"
                name="Staging"
                slug="staging"
                description="Pre-production testing"
                onSelect={() => {
                  handleNameChange('Staging');
                }}
              />
              <EnvironmentPreset
                icon={Code2}
                iconBg="bg-info/10"
                iconColor="text-info"
                name="Development"
                slug="development"
                description="Local development & testing"
                onSelect={() => {
                  handleNameChange('Development');
                }}
              />
            </div>
          </div>

          {/* Tips */}
          <div className="animate-fade-in-up stagger-4 space-y-3">
            <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wider uppercase">
              Tips
            </h2>
            <div className="island space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Lightbulb className="text-primary size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">One branch, many environments</p>
                  <p className="text-muted-foreground text-xs">
                    Multiple environments can point to the same branch. Use this for A/B testing or
                    gradual rollouts.
                  </p>
                </div>
              </div>
              <div className="bg-border h-px" />
              <div className="flex items-start gap-3">
                <div className="bg-warm/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <GitBranch className="text-warm size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Switch branches anytime</p>
                  <p className="text-muted-foreground text-xs">
                    You can change which branch an environment points to later from the environment
                    settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation Link */}
          <div className="animate-fade-in-up stagger-5 space-y-3">
            <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wider uppercase">
              Resources
            </h2>
            <a
              href="https://docs.lingx.dev/environments"
              target="_blank"
              rel="noopener noreferrer"
              className="island hover:bg-accent/50 group flex items-center gap-3 p-4 transition-colors"
            >
              <div className="bg-muted group-hover:bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors">
                <BookOpen className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="group-hover:text-primary text-sm font-medium transition-colors">
                  Environment Guide
                </p>
                <p className="text-muted-foreground text-xs">
                  Learn best practices for environment setup
                </p>
              </div>
              <ChevronRight className="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * EnvironmentPreset - Quick preset button for common environments
 */
function EnvironmentPreset({
  icon: Icon,
  iconBg,
  iconColor,
  name,
  slug,
  description,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  name: string;
  slug: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="hover:bg-accent/50 group flex w-full items-center gap-3 p-4 text-left transition-colors"
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
          iconBg
        )}
      >
        <Icon className={cn('size-5', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{name}</p>
          <code className="text-muted-foreground font-mono text-xs">{slug}</code>
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <ChevronRight className="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
    </button>
  );
}
