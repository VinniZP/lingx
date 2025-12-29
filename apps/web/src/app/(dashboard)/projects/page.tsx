'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { projectApi, Project } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, FolderOpen, Globe } from 'lucide-react';

export default function ProjectsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Failed to load projects. Please try again.
      </div>
    );
  }

  const projects = data?.projects || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your localization projects
          </p>
        </div>
        <Button asChild className="h-11 w-full sm:w-auto touch-manipulation">
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to get started with localization.
            </p>
            <Button asChild className="h-11 touch-manipulation">
              <Link href="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="touch-manipulation hover:border-primary/50 hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {project.name}
          </CardTitle>
          <CardDescription>{project.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>
              {project.languages.length} language
              {project.languages.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {project.languages.slice(0, 5).map((lang) => (
              <span
                key={lang.code}
                className={`px-2 py-0.5 rounded text-xs ${
                  lang.isDefault
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {lang.code}
              </span>
            ))}
            {project.languages.length > 5 && (
              <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                +{project.languages.length - 5}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
