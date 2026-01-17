'use client';

import { LoadingPulse } from '@/components/namespace-loader';
import { SettingsSectionHeader } from '@/components/settings';
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
import { Textarea } from '@/components/ui/textarea';
import { useRequirePermission } from '@/hooks';
import { ApiError, projectApi, UpdateProjectInput } from '@/lib/api';
import { AVAILABLE_LANGUAGES, getLanguageByCode } from '@/lib/languages';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, FileText, Globe2, Hash, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const settingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters')
    .max(50, 'Project name must be less than 50 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  defaultLanguage: z.string().min(1, 'Select a default language'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectSettingsPage({ params }: PageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Permission check - MANAGER+ required for settings page
  const {
    isLoading: isLoadingPermissions,
    hasPermission,
    permissions: { canDeleteProject },
  } = useRequirePermission({ projectId, permission: 'canManageSettings' });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
      languages: [],
      defaultLanguage: '',
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        languages: project.languages.map((l) => l.code),
        defaultLanguage: project.defaultLanguage,
      });
      // Trigger validation after reset to enable save button when form becomes dirty
      void form.trigger();
    }
  }, [project, form]);

  const selectedLanguages = useWatch({ control: form.control, name: 'languages' });
  const defaultLanguage = useWatch({ control: form.control, name: 'defaultLanguage' });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProjectInput) => projectApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projectSettings.toasts.projectUpdated'), {
        description: t('projectSettings.toasts.projectUpdatedDescription'),
      });
    },
    onError: (error: ApiError) => {
      toast.error(t('projectSettings.toasts.projectUpdateFailed'), {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projectSettings.toasts.projectDeleted'), {
        description: t('projectSettings.toasts.projectDeletedDescription'),
      });
      router.push('/projects');
    },
    onError: (error: ApiError) => {
      toast.error(t('projectSettings.toasts.projectDeleteFailed'), {
        description: error.message,
      });
    },
  });

  const toggleLanguage = (code: string) => {
    const current = selectedLanguages || [];
    if (current.includes(code)) {
      if (code === defaultLanguage) return;
      form.setValue(
        'languages',
        current.filter((c) => c !== code),
        { shouldValidate: true, shouldDirty: true }
      );
    } else {
      form.setValue('languages', [...current, code], { shouldValidate: true, shouldDirty: true });
    }
  };

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate({
      name: data.name,
      description: data.description || undefined,
      languageCodes: data.languages,
      defaultLanguage: data.defaultLanguage,
    });
  };

  // Show loading state while checking permissions or loading project data
  if (!project || isLoadingPermissions || !hasPermission) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <LoadingPulse />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Project Details Section */}
          <section className="space-y-6">
            <SettingsSectionHeader
              icon={FileText}
              title={t('projectSettings.details.title')}
              description={t('projectSettings.details.subtitle')}
            />

            <div className="border-border/60 bg-card/50 overflow-hidden rounded-2xl border">
              <div className="space-y-5 p-6">
                {/* Project Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {t('projectSettings.details.name')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('projectSettings.details.namePlaceholder')}
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Slug (read-only) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-sm font-medium">
                      {t('projectSettings.details.identifier')}
                    </FormLabel>
                    <Hash className="text-muted-foreground size-3.5" />
                  </div>
                  <div className="relative">
                    <Input
                      value={project.slug}
                      disabled
                      className="bg-muted/30 text-muted-foreground pr-24 font-mono text-sm"
                    />
                    <span className="text-muted-foreground/60 absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-medium tracking-wider uppercase">
                      {t('projectSettings.details.readOnly')}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    {t('projectSettings.details.identifierDescription')}
                  </p>
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-baseline justify-between">
                        <FormLabel className="text-sm font-medium">
                          {t('projectSettings.details.description')}
                        </FormLabel>
                        <span className="text-muted-foreground text-[11px]">
                          {t('common.optional')}
                        </span>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder={t('projectSettings.details.descriptionPlaceholder')}
                          rows={3}
                          className="bg-background/50 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Languages Section */}
          <section className="space-y-6">
            <SettingsSectionHeader
              icon={Globe2}
              title={t('projectSettings.languages.title')}
              description={
                selectedLanguages?.length > 0
                  ? `${t('projectSettings.languages.subtitle')} · ${t('projectSettings.languages.selectedCount', { count: selectedLanguages.length })}`
                  : t('projectSettings.languages.subtitle')
              }
              color="blue"
            />

            <div className="border-border/60 bg-card/50 overflow-hidden rounded-2xl border">
              <div className="space-y-6 p-6">
                {/* Language Grid */}
                <FormField
                  control={form.control}
                  name="languages"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                        {AVAILABLE_LANGUAGES.map((lang) => {
                          const isSelected = selectedLanguages?.includes(lang.code);
                          const isDefault = lang.code === defaultLanguage;

                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => toggleLanguage(lang.code)}
                              className={cn(
                                'group relative flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium transition-all duration-200',
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-background/50 border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30'
                              )}
                            >
                              <span className="text-base">{lang.flag}</span>
                              <span className="flex-1 truncate text-left">{lang.name}</span>
                              {isSelected && <Check className="size-4 shrink-0" />}
                              {isDefault && isSelected && (
                                <span className="bg-warning text-warning-foreground absolute -top-2 -right-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase shadow-sm">
                                  {t('projectSettings.languages.source')}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Default Language Selector */}
                {selectedLanguages?.length > 0 && (
                  <>
                    <div className="from-border via-border/50 h-px bg-linear-to-r to-transparent" />

                    <FormField
                      control={form.control}
                      name="defaultLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            {t('projectSettings.languages.sourceLanguage')}
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue
                                  placeholder={t('projectSettings.languages.selectSourceLanguage')}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(selectedLanguages || []).map((code) => {
                                const lang = getLanguageByCode(code);
                                return (
                                  <SelectItem key={code} value={code}>
                                    <span className="flex items-center gap-2">
                                      <span>{lang?.flag}</span>
                                      <span>{lang?.name || code}</span>
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[11px]">
                            {t('projectSettings.languages.sourceLanguageDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              {/* Save Footer */}
              <div className="bg-muted/20 border-border/40 flex items-center justify-between border-t px-6 py-4">
                <p className="text-muted-foreground text-[11px]">
                  {form.formState.isDirty
                    ? t('projectSettings.unsavedChanges')
                    : t('projectSettings.allChangesSaved')}
                </p>
                <Button
                  type="submit"
                  disabled={
                    updateMutation.isPending || !form.formState.isValid || !form.formState.isDirty
                  }
                  className="min-w-[120px]"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('common.saveChanges')
                  )}
                </Button>
              </div>
            </div>
          </section>
        </form>
      </Form>

      {/* Danger Zone - OWNER only */}
      {canDeleteProject && (
        <section className="space-y-6">
          <SettingsSectionHeader
            icon={AlertTriangle}
            title={t('projectSettings.dangerZone.title')}
            description={t('projectSettings.dangerZone.subtitle')}
            color="destructive"
          />

          <div className="border-destructive/20 bg-destructive/[0.02] overflow-hidden rounded-2xl border">
            <div className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {t('projectSettings.dangerZone.deleteTitle')}
                  </p>
                  <p className="text-muted-foreground mt-1 max-w-md text-[11px] leading-relaxed">
                    {t('projectSettings.dangerZone.deleteDescription')}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="shrink-0 gap-2">
                      <Trash2 className="size-4" />
                      {t('projectSettings.dangerZone.deleteButton')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('dialogs.deleteConfirm.deleteProject')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('projectSettings.dangerZone.deleteDialogDescription', {
                          projectName: project.name,
                        })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            {t('common.deleting')}
                          </>
                        ) : (
                          t('common.delete')
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
