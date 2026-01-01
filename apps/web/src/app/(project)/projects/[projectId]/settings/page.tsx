'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectApi, UpdateProjectInput, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { Trash2, Globe2, Check, Loader2, FileText, Hash, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
];

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
    }
  }, [project, form]);

  const selectedLanguages = form.watch('languages');
  const defaultLanguage = form.watch('defaultLanguage');

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
      form.setValue('languages', current.filter((c) => c !== code), { shouldValidate: true });
    } else {
      form.setValue('languages', [...current, code], { shouldValidate: true });
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

  if (!project) {
    return null; // Layout handles loading state
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Project Details Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center">
                <FileText className="size-[18px] text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t('projectSettings.details.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('projectSettings.details.subtitle')}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Project Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('projectSettings.details.name')}</FormLabel>
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
                    <FormLabel className="text-sm font-medium">{t('projectSettings.details.identifier')}</FormLabel>
                    <Hash className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="relative">
                    <Input
                      value={project.slug}
                      disabled
                      className="bg-muted/30 font-mono text-sm text-muted-foreground pr-24"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      {t('projectSettings.details.readOnly')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
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
                        <FormLabel className="text-sm font-medium">{t('projectSettings.details.description')}</FormLabel>
                        <span className="text-[11px] text-muted-foreground">{t('common.optional')}</span>
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
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/10 flex items-center justify-center">
                <Globe2 className="size-[18px] text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t('projectSettings.languages.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('projectSettings.languages.subtitle')}
                  {selectedLanguages?.length > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      · {t('projectSettings.languages.selectedCount', { count: selectedLanguages.length })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/50 overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Language Grid */}
                <FormField
                  control={form.control}
                  name="languages"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {AVAILABLE_LANGUAGES.map((lang) => {
                          const isSelected = selectedLanguages?.includes(lang.code);
                          const isDefault = lang.code === defaultLanguage;

                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => toggleLanguage(lang.code)}
                              className={cn(
                                'group relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 border',
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-background/50 border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30'
                              )}
                            >
                              <span className="text-base">{lang.flag}</span>
                              <span className="truncate flex-1 text-left">{lang.name}</span>
                              {isSelected && (
                                <Check className="size-4 shrink-0" />
                              )}
                              {isDefault && isSelected && (
                                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-warning text-warning-foreground shadow-sm">
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
                    <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />

                    <FormField
                      control={form.control}
                      name="defaultLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">{t('projectSettings.languages.sourceLanguage')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder={t('projectSettings.languages.selectSourceLanguage')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(selectedLanguages || []).map((code) => {
                                const lang = AVAILABLE_LANGUAGES.find((l) => l.code === code);
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
              <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  {form.formState.isDirty ? t('projectSettings.unsavedChanges') : t('projectSettings.allChangesSaved')}
                </p>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !form.formState.isValid || !form.formState.isDirty}
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

      {/* Danger Zone */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/5 border border-destructive/10 flex items-center justify-center">
            <AlertTriangle className="size-[18px] text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-destructive">{t('projectSettings.dangerZone.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('projectSettings.dangerZone.subtitle')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.02] overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{t('projectSettings.dangerZone.deleteTitle')}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed max-w-md">
                  {t('projectSettings.dangerZone.deleteDescription')}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2 shrink-0">
                    <Trash2 className="size-4" />
                    {t('projectSettings.dangerZone.deleteButton')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('dialogs.deleteConfirm.deleteProject')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('projectSettings.dangerZone.deleteDialogDescription', { projectName: project.name })}
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
                          <Loader2 className="size-4 animate-spin mr-2" />
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
    </div>
  );
}
