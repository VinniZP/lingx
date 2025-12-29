'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { ArrowLeft, Trash2, Globe2, Check, Loader2, Settings } from 'lucide-react';
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

// Validation schema
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

  const { data: project, isLoading } = useQuery({
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

  // Update form when project data loads
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
    mutationFn: (data: UpdateProjectInput) =>
      projectApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated', {
        description: 'Your changes have been saved.',
      });
    },
    onError: (error: ApiError) => {
      toast.error('Failed to update project', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted', {
        description: 'The project has been deleted.',
      });
      router.push('/projects');
    },
    onError: (error: ApiError) => {
      toast.error('Failed to delete project', {
        description: error.message,
      });
    },
  });

  const toggleLanguage = (code: string) => {
    const current = selectedLanguages || [];
    if (current.includes(code)) {
      // Don't allow removing the default language
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-10 rounded-xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Settings className="size-5 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-destructive p-6 rounded-xl bg-destructive/10 border border-destructive/20">
        Project not found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 animate-fade-in-up">
        <Button variant="ghost" size="icon" asChild aria-label="Go back to project">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {project.name}
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
                Update your project information
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
                    <Input placeholder="My Application" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug (read-only) */}
            <div className="space-y-2">
              <FormLabel>Slug</FormLabel>
              <Input
                value={project.slug}
                disabled
                className="bg-muted font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Slug cannot be changed after creation
              </p>
            </div>

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
                Manage your project languages
              </p>
            </div>

            {/* Language Grid */}
            <FormField
              control={form.control}
              name="languages"
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
                            'relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
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

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isValid}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Danger Zone */}
      <div className="island p-6 border-destructive/30 animate-fade-in-up stagger-3">
        <div className="mb-4">
          <h2 className="font-semibold text-lg text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Irreversible actions for this project
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="size-4" />
              Delete Project
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{project.name}&quot; and
                all its spaces, branches, and translations. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
