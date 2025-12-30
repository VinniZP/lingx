'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, type CreateProjectInput } from '@localeflow/shared';
import { projectApi, ApiError } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
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
import { toast } from 'sonner';
import { ArrowLeft, Globe2, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
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

export default function NewProjectPage() {
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

  const selectedLanguages = form.watch('languageCodes');
  const defaultLanguage = form.watch('defaultLanguage');

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectInput) => projectApi.create(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created', {
        description: `${project.name} has been created successfully.`,
      });
      router.push(`/projects/${project.id}`);
    },
    onError: (error: ApiError) => {
      // Try to map field-level errors to form fields first
      if (!handleApiFieldErrors(error, form.setError)) {
        // Only show toast for non-field errors
        toast.error('Failed to create project', {
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
      form.setValue('languageCodes', current.filter((c) => c !== code), { shouldValidate: true });
    } else {
      form.setValue('languageCodes', [...current, code], { shouldValidate: true });
    }
  };

  const onSubmit = (data: CreateProjectInput) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Go back to projects">
          <Link href="/projects">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create a new localization project
          </p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Project Details Card */}
          <div className="island p-6 space-y-6 animate-fade-in-up stagger-1">
            <div>
              <h2 className="font-semibold text-lg">Project Details</h2>
              <p className="text-sm text-muted-foreground">
                Enter the basic information for your project
              </p>
            </div>

            {/* Project Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Application"
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
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="my-application"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL-safe identifier for your project
                  </FormDescription>
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
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your project..."
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
          <div className="island p-6 space-y-6 animate-fade-in-up stagger-2">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Globe2 className="size-5 text-primary" />
                Languages
              </h2>
              <p className="text-sm text-muted-foreground">
                Select the languages for your project
              </p>
            </div>

            {/* Language Grid */}
            <FormField
              control={form.control}
              name="languageCodes"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {AVAILABLE_LANGUAGES.map((lang) => {
                      const isSelected = selectedLanguages?.includes(lang.code);
                      const isDefault = lang.code === defaultLanguage;

                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => toggleLanguage(lang.code)}
                          className={cn(
                            'relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <span className="text-base">{lang.flag}</span>
                          <span className="truncate">{lang.name}</span>
                          {isSelected && (
                            <Check className="size-3.5 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                          {isDefault && isSelected && (
                            <span className="absolute -top-1 -right-1 size-3 bg-warning rounded-full border-2 border-card" />
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
                <FormItem className="pt-4 border-t border-border">
                  <FormLabel>Default Language</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select default language" />
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
                  <FormDescription>
                    The source language for translations
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end animate-fade-in-up stagger-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !form.formState.isValid}
              className="sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
