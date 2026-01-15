'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectResponse } from '@lingx/shared';
import { ArrowRight, FolderOpen, Plus } from 'lucide-react';
import Link from 'next/link';

interface RecentProjectsProps {
  projects: ProjectResponse[];
  isLoading: boolean;
}

export function RecentProjects({ projects, isLoading }: RecentProjectsProps) {
  const { t } = useTranslation();

  const recentProjects = projects.slice(0, 3).map((p) => ({
    id: p.id,
    name: p.name,
    languages: p.languages.length,
    updatedAt: new Date(p.updatedAt).toLocaleDateString(),
  }));

  return (
    <div className="space-y-6 lg:col-span-5">
      {/* Primary CTA Card */}
      <Link
        href="/projects/new"
        className="island card-hover group animate-fade-in-up stagger-1 block p-6"
      >
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors">
            <Plus className="text-primary group-hover:text-primary-foreground size-6 transition-colors" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{t('dashboard.createProject.title')}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('dashboard.createProject.description')}
            </p>
            <div className="text-primary mt-4 flex items-center text-sm font-medium">
              {t('dashboard.createProject.cta')}
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>

      {/* Recent Projects */}
      <div className="animate-fade-in-up stagger-2 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {t('dashboard.recentProjects')}
          </h2>
          <Link href="/projects" className="text-primary text-xs hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="island divide-border divide-y">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="mb-1.5 h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentProjects.length > 0 ? (
            <>
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="hover:bg-muted/50 group flex items-center gap-3 p-4 transition-colors"
                >
                  <div className="bg-primary/10 group-hover:bg-primary/20 flex size-10 items-center justify-center rounded-lg transition-colors">
                    <FolderOpen className="text-primary size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {t('common.languages', { count: project.languages })} · {project.updatedAt}
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
              {/* Add project hint */}
              <Link
                href="/projects/new"
                className="text-muted-foreground hover:text-foreground flex items-center gap-3 p-4 transition-colors"
              >
                <div className="border-muted-foreground/30 flex size-10 items-center justify-center rounded-lg border-2 border-dashed">
                  <Plus className="size-4" />
                </div>
                <span className="text-sm">Add another project</span>
              </Link>
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="bg-muted mx-auto mb-3 flex size-12 items-center justify-center rounded-xl">
                <FolderOpen className="text-muted-foreground size-6" />
              </div>
              <p className="text-muted-foreground mb-3 text-sm">No projects yet</p>
              <Button asChild size="sm">
                <Link href="/projects/new">Create your first project</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
