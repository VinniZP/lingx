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
import { Textarea } from '@/components/ui/textarea';
import { ApiError, projectApi } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { AVAILABLE_LANGUAGES, getLanguageByCode } from '@/lib/languages';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lingx/sdk-nextjs';
import { createProjectSchema, type CreateProjectInput } from '@lingx/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Globe2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

export default function NewProjectPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      languageCodes: ['en'],
      defaultLanguage: 'en',
    },
  });

  const selectedLanguages = useWatch({ control: form.control, name: 'languageCodes' });
  const defaultLanguage = useWatch({ control: form.control, name: 'defaultLanguage' });

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectInput) => projectApi.create(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.newProject.success'), {
        description: t('projects.newProject.successDescription', { name: project.name }),
      });
      router.push(`/projects/${project.id}`);
    },
    onError: (error: ApiError) => {
      // Try to map field-level errors to form fields first
      if (!handleApiFieldErrors(error, form.setError)) {
        // Only show toast for non-field errors
        toast.error(t('projects.newProject.failed'), {
          description: error.message,
        });
      }
    },
  });

  const handleNameChange = (value: string) => {
    form.setValue('name', value, { shouldValidate: true });
    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    form.setValue('slug', generatedSlug, { shouldValidate: true });
  };

  const toggleLanguage = (code: string) => {
    const current = selectedLanguages || [];
    if (current.includes(code)) {
      // Don't allow removing the default language
      if (code === defaultLanguage) return;
      form.setValue(
        'languageCodes',
        current.filter((c) => c !== code),
        { shouldValidate: true }
      );
    } else {
      form.setValue('languageCodes', [...current, code], { shouldValidate: true });
    }
  };

  const onSubmit = (data: CreateProjectInput) => {
    createMutation.mutate(data);
  };

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label={t('projects.newProject.backLabel')}>
          <Link href="/projects">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('projects.newProject.title')}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t('projects.newProject.subtitle')}
          </p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Project Details Card */}
          <div className="island animate-fade-in-up stagger-1 space-y-6 p-6">
            <div>
              <h2 className="text-lg font-semibold">{t('projects.newProject.details.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('projects.newProject.details.description')}
              </p>
            </div>

            {/* Project Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.newProject.name.label')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('projects.newProject.name.placeholder')}
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.newProject.slug.label')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('projects.newProject.slug.placeholder')}
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('projects.newProject.slug.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('projects.newProject.description.label')}{' '}
                    <span className="text-muted-foreground font-normal">
                      ({t('projects.newProject.description.optional')})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('projects.newProject.description.placeholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Languages Card */}
          <div className="island animate-fade-in-up stagger-2 space-y-6 p-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Globe2 className="text-primary size-5" />
                {t('projects.newProject.languages.title')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t('projects.newProject.languages.description')}
              </p>
            </div>

            {/* Language Grid */}
            <FormField
              control={form.control}
              name="languageCodes"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {AVAILABLE_LANGUAGES.map((lang) => {
                      const isSelected = selectedLanguages?.includes(lang.code);
                      const isDefault = lang.code === defaultLanguage;

                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => toggleLanguage(lang.code)}
                          className={cn(
                            'relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <span className="text-base">{lang.flag}</span>
                          <span className="truncate">{lang.name}</span>
                          {isSelected && (
                            <Check className="absolute top-1/2 right-2 size-3.5 -translate-y-1/2" />
                          )}
                          {isDefault && isSelected && (
                            <span className="bg-warning border-card absolute -top-1 -right-1 size-3 rounded-full border-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Language */}
            <FormField
              control={form.control}
              name="defaultLanguage"
              render={({ field }) => (
                <FormItem className="border-border border-t pt-4">
                  <FormLabel>{t('projects.newProject.languages.defaultLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('projects.newProject.languages.defaultPlaceholder')}
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
                  <FormDescription>
                    {t('projects.newProject.languages.defaultDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="animate-fade-in-up stagger-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="sm:w-auto"
            >
              {t('projects.newProject.actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !form.formState.isValid}
              className="sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('projects.newProject.actions.creating')}
                </>
              ) : (
                t('projects.newProject.actions.create')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
