'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, UpdateProjectInput, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
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

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' },
];

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

  // Use local state initialized from project data, falling back to empty values
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState('');

  // Compute effective values - use local state if user has modified, otherwise use project data
  const effectiveName = name || project?.name || '';
  const effectiveDescription = description || project?.description || '';
  const effectiveLanguages =
    selectedLanguages.length > 0
      ? selectedLanguages
      : project?.languages.map((l) => l.code) || [];
  const effectiveDefaultLanguage =
    defaultLanguage || project?.defaultLanguage || '';

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
    // Initialize from project if user hasn't made changes
    const currentLangs =
      selectedLanguages.length > 0
        ? selectedLanguages
        : project?.languages.map((l) => l.code) || [];
    const currentDefaultLang = defaultLanguage || project?.defaultLanguage || '';

    if (currentLangs.includes(code)) {
      if (code === currentDefaultLang) {
        setSelectedLanguages(currentLangs);
        return;
      }
      setSelectedLanguages(currentLangs.filter((c) => c !== code));
    } else {
      setSelectedLanguages([...currentLangs, code]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: effectiveName,
      description: effectiveDescription || undefined,
      languageCodes: effectiveLanguages,
      defaultLanguage: effectiveDefaultLanguage,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-destructive">Project not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-11 w-11 touch-manipulation" asChild>
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Project Settings</h1>
          <p className="text-muted-foreground mt-1">{project.name}</p>
        </div>
      </div>

      <Card className="touch-manipulation">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your project information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={effectiveName}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={project.slug} disabled className="h-11 w-full bg-muted" />
              <p className="text-sm text-muted-foreground">
                Slug cannot be changed after creation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={effectiveDescription}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full min-h-[88px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`px-3 py-2.5 min-h-[44px] rounded-md text-sm transition-colors touch-manipulation ${
                      effectiveLanguages.includes(lang.code)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {lang.name} ({lang.code})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">Default Language</Label>
              <select
                id="defaultLanguage"
                value={effectiveDefaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="h-11 w-full px-3 py-2 border rounded-md bg-background touch-manipulation"
              >
                {effectiveLanguages.map((code) => {
                  const lang = AVAILABLE_LANGUAGES.find((l) => l.code === code);
                  return (
                    <option key={code} value={code}>
                      {lang?.name || code}
                    </option>
                  );
                })}
              </select>
            </div>

            <Button type="submit" disabled={updateMutation.isPending} className="h-11 w-full sm:w-auto touch-manipulation">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50 touch-manipulation">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="h-11 w-full sm:w-auto touch-manipulation">
                <Trash2 className="h-4 w-4 mr-2" />
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
              <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                <AlertDialogCancel className="h-11 touch-manipulation">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-manipulation"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
