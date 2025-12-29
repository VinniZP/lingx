'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { spaceApi, projectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, GitBranch, Plus, Settings, Key } from 'lucide-react';

interface PageProps {
  params: Promise<{ projectId: string; spaceId: string }>;
}

export default function SpaceDetailPage({ params }: PageProps) {
  const { projectId, spaceId } = use(params);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: space, isLoading } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => spaceApi.get(spaceId),
  });

  const { data: stats } = useQuery({
    queryKey: ['space-stats', spaceId],
    queryFn: () => spaceApi.getStats(spaceId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading space...
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="text-destructive">Space not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-11 w-11 touch-manipulation" aria-label="Go back to spaces">
            <Link href={`/projects/${projectId}/spaces`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <div className="text-sm text-muted-foreground">{project?.name}</div>
            <h1 className="text-2xl font-bold sm:text-3xl">{space.name}</h1>
          </div>
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 touch-manipulation self-start sm:self-auto" aria-label="Space settings">
          <Settings className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {space.description && (
        <p className="text-muted-foreground">{space.description}</p>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Branches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">
                {stats?.branches || space.branches.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Translation Keys</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats?.totalKeys || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Default Branch</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {space.branches.find((b) => b.isDefault)?.name || 'main'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Branches */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Branches</CardTitle>
            <CardDescription>
              Manage translation branches for this space
            </CardDescription>
          </div>
          <Button size="sm" asChild className="h-11 w-full sm:w-auto touch-manipulation">
            <Link
              href={`/projects/${projectId}/spaces/${spaceId}/branches/new`}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Branch
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {space.branches.map((branch) => (
              <Link
                key={branch.id}
                href={`/projects/${projectId}/spaces/${spaceId}/branches/${branch.id}`}
                className="touch-manipulation flex flex-col gap-3 p-4 rounded-md border hover:border-primary/50 hover:shadow-sm transition-shadow sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{branch.name}</span>
                  {branch.isDefault && (
                    <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                      default
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(branch.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Translation Coverage */}
      {stats && Object.keys(stats.translationsByLanguage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Translation Coverage</CardTitle>
            <CardDescription>Coverage in the default branch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.translationsByLanguage).map(
                ([code, langStats]) => (
                  <div key={code} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium uppercase">{code}</span>
                      <span className="text-muted-foreground">
                        {langStats.translated} / {langStats.total} (
                        {langStats.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${langStats.percentage}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
