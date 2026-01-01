'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEnvironmentSchema, type CreateEnvironmentInput } from '@localeflow/shared';
import { useTranslation } from '@localeflow/sdk-nextjs';
import {
  environmentApi,
  projectApi,
  spaceApi,
  branchApi,
  ApiError,
} from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Server,
  GitBranch,
  Sparkles,
  Zap,
  Plus,
  Rocket,
  FlaskConical,
  Code2,
  Lightbulb,
  Star,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
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
      const defaultBranch =
        allBranches.find((b) => b.isDefault) || allBranches[0];
      if (defaultBranch) {
        form.setValue('branchId', defaultBranch.id);
      }
    }
  }, [allBranches, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateEnvironmentInput) =>
      environmentApi.create(projectId, data),
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

  const selectedBranchId = form.watch('branchId');
  const selectedBranch = allBranches?.find((b) => b.id === selectedBranchId);
  const watchedName = form.watch('name');
  const watchedSlug = form.watch('slug');

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="island p-6 lg:p-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Icon */}
          <div className="relative shrink-0">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-warm/20 via-warm/10 to-primary/10 flex items-center justify-center border border-warm/20">
              <Server className="size-7 text-warm" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <Link
                href={`/projects/${projectId}/environments`}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to environments"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
                New Environment
              </h1>
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
        <div className="lg:col-span-7 space-y-6">
          {/* Form Island */}
          <div className="island p-6 animate-fade-in-up stagger-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Environment Details</h2>
                <p className="text-sm text-muted-foreground">
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
                      <FormDescription>
                        A descriptive name for this environment
                      </FormDescription>
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
                        <Input
                          {...field}
                          placeholder="production"
                          className="font-mono"
                        />
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allBranches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                <div className="flex items-center gap-2">
                                  <GitBranch className="size-4 text-muted-foreground" />
                                  <span>
                                    {branch.spaceName} / {branch.name}
                                  </span>
                                  {branch.isDefault && (
                                    <Star className="size-3 text-warning fill-warning" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="h-11 px-4 rounded-xl border bg-muted/50 flex items-center text-sm text-muted-foreground">
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
                  <div className="p-4 rounded-xl border bg-muted/30 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Zap className="size-4 text-warm" />
                      Configuration Preview
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-medium">{watchedName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Slug:</span>{' '}
                        <code className="font-mono text-primary">{watchedSlug}</code>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <GitBranch className="size-4 text-muted-foreground" />
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
                    disabled={
                      createMutation.isPending ||
                      !allBranches?.length
                    }
                    className="h-11 gap-2"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Presets */}
          <div className="space-y-3 animate-fade-in-up stagger-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Common Environments
            </h2>
            <div className="island divide-y divide-border">
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
          <div className="space-y-3 animate-fade-in-up stagger-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Tips
            </h2>
            <div className="island p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="size-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">One branch, many environments</p>
                  <p className="text-xs text-muted-foreground">
                    Multiple environments can point to the same branch. Use this for
                    A/B testing or gradual rollouts.
                  </p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-warm/10 flex items-center justify-center shrink-0">
                  <GitBranch className="size-4 text-warm" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Switch branches anytime</p>
                  <p className="text-xs text-muted-foreground">
                    You can change which branch an environment points to later
                    from the environment settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation Link */}
          <div className="space-y-3 animate-fade-in-up stagger-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Resources
            </h2>
            <a
              href="https://docs.localeflow.dev/environments"
              target="_blank"
              rel="noopener noreferrer"
              className="island p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <BookOpen className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm group-hover:text-primary transition-colors">
                  Environment Guide
                </p>
                <p className="text-xs text-muted-foreground">
                  Learn best practices for environment setup
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
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
      className="w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left group"
    >
      <div
        className={cn(
          'size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
          iconBg
        )}
      >
        <Icon className={cn('size-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{name}</p>
          <code className="text-xs text-muted-foreground font-mono">{slug}</code>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
