'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { spaceApi, projectApi, CreateSpaceInput, ApiError } from '@/lib/api';
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

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function NewSpacePage({ params }: PageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSpaceInput) => spaceApi.create(projectId, data),
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', projectId] });
      toast.success('Space created', {
        description: `${space.name} has been created with a main branch.`,
      });
      router.push(`/projects/${projectId}/spaces/${space.id}`);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to create space', {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      slug,
      description: description || undefined,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 px-0 sm:px-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-11 w-11 touch-manipulation">
          <Link href={`/projects/${projectId}/spaces`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">New Space</h1>
          <p className="text-muted-foreground mt-1">
            {project?.name} - Create a new space
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Space Details</CardTitle>
          <CardDescription>
            Spaces organize translations within a project (e.g., &quot;frontend&quot;,
            &quot;backend&quot;)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Space Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Frontend"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="frontend"
                pattern="^[a-z0-9-]+$"
                required
                className="h-11"
              />
              <p className="text-sm text-muted-foreground">
                URL-safe identifier for your space
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Frontend web application translations..."
                rows={3}
                className="min-h-[88px]"
              />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
              <p className="text-sm text-primary">
                A <strong>main</strong> branch will be automatically created
                when you create this space.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-11 w-full sm:w-auto touch-manipulation"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !name || !slug}
                className="h-11 w-full sm:w-auto touch-manipulation"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Space'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
