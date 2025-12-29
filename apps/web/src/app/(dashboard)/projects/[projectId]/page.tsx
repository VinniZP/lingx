'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { projectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Settings, Globe, Layers, GitBranch, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = use(params);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectApi.getStats(projectId),
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading project...
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-destructive">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button variant="ghost" size="icon" asChild className="h-11 w-11 touch-manipulation shrink-0 self-start sm:self-auto">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl truncate">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.slug}</p>
        </div>
        <Button variant="outline" asChild className="h-11 w-full sm:w-auto touch-manipulation">
          <Link href={`/projects/${projectId}/settings`}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>

      {project.description && (
        <p className="text-muted-foreground">{project.description}</p>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Languages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {project.languages.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spaces</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-chart-2" />
              <span className="text-2xl font-bold">
                {statsLoading ? '-' : stats?.spaces || 0}
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
              <GitBranch className="h-5 w-5 text-chart-3" />
              <span className="text-2xl font-bold">
                {statsLoading ? '-' : stats?.totalKeys || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Default Language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold uppercase">
                {project.defaultLanguage}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Translation Coverage</CardTitle>
          <CardDescription>Translation progress by language</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="animate-pulse text-muted-foreground">
              Loading...
            </div>
          ) : (
            <div className="space-y-4">
              {project.languages.map((lang) => {
                const langStats = stats?.translationsByLanguage[lang.code];
                const percentage = langStats?.percentage || 0;

                return (
                  <div key={lang.code} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {lang.name}
                        {lang.isDefault && (
                          <span className="ml-2 text-xs text-primary">
                            (default)
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {langStats?.translated || 0} / {langStats?.total || 0}{' '}
                        ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <Button asChild className="h-11 w-full sm:w-auto touch-manipulation">
          <Link href={`/projects/${projectId}/spaces`}>
            <Layers className="h-4 w-4 mr-2" />
            Manage Spaces
          </Link>
        </Button>
      </div>
    </div>
  );
}
