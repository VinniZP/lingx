'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { spaceApi, projectApi, Space } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Layers, GitBranch, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function SpacesPage({ params }: PageProps) {
  const { projectId } = use(params);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['spaces', projectId],
    queryFn: () => spaceApi.list(projectId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading spaces...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Failed to load spaces. Please try again.
      </div>
    );
  }

  const spaces = data?.spaces || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-11 w-11 touch-manipulation">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Spaces</h1>
            <p className="text-muted-foreground mt-1">
              {project?.name} - Manage translation spaces
            </p>
          </div>
        </div>
        <Button asChild className="h-11 w-full sm:w-auto touch-manipulation">
          <Link href={`/projects/${projectId}/spaces/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Space
          </Link>
        </Button>
      </div>

      {spaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No spaces yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first space to organize translations.
            </p>
            <Button asChild className="h-11 touch-manipulation">
              <Link href={`/projects/${projectId}/spaces/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Space
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpaceCard({ space, projectId }: { space: Space; projectId: string }) {
  const { data: stats } = useQuery({
    queryKey: ['space-stats', space.id],
    queryFn: () => spaceApi.getStats(space.id),
  });

  return (
    <Link href={`/projects/${projectId}/spaces/${space.id}`}>
      <Card className="touch-manipulation hover:border-primary/50 hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5" />
            {space.name}
          </CardTitle>
          <CardDescription>{space.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          {space.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {space.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <GitBranch className="h-4 w-4" />
              <span>
                {stats?.branches || 1} branch
                {(stats?.branches || 1) !== 1 ? 'es' : ''}
              </span>
            </div>
            <div>
              {stats?.totalKeys || 0} key
              {stats?.totalKeys !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
