'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, CreateProjectInput, ApiError } from '@/lib/api';
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
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [defaultLanguage, setDefaultLanguage] = useState('en');

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
      toast.error('Failed to create project', {
        description: error.message,
      });
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(code)) {
        // Don't allow removing the default language
        if (code === defaultLanguage) return prev;
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      slug,
      description: description || undefined,
      languageCodes: selectedLanguages,
      defaultLanguage,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Project</h1>
          <p className="text-muted-foreground mt-1">
            Create a new localization project
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Enter the basic information for your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Application"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-application"
                pattern="^[a-z0-9-]+$"
                required
              />
              <p className="text-sm text-muted-foreground">
                URL-safe identifier for your project
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select the languages for your project
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedLanguages.includes(lang.code)
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
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                {selectedLanguages.map((code) => {
                  const lang = AVAILABLE_LANGUAGES.find((l) => l.code === code);
                  return (
                    <option key={code} value={code}>
                      {lang?.name || code}
                    </option>
                  );
                })}
              </select>
              <p className="text-sm text-muted-foreground">
                The source language for translations
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !name || !slug}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
