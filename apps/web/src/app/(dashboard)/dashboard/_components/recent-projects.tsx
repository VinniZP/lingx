'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, ArrowRight, Plus } from 'lucide-react';
import { useTranslation } from '@localeflow/sdk-nextjs';
import type { ProjectResponse } from '@localeflow/shared';

interface RecentProjectsProps {
  projects: ProjectResponse[];
  isLoading: boolean;
}

export function RecentProjects({ projects, isLoading }: RecentProjectsProps) {
  const { t } = useTranslation();

  const recentProjects = projects.slice(0, 3).map(p => ({
    id: p.id,
    name: p.name,
    languages: p.languages.length,
    updatedAt: new Date(p.updatedAt).toLocaleDateString(),
  }));

  return (
    <div className="lg:col-span-5 space-y-6">
      {/* Primary CTA Card */}
      <Link
        href="/projects/new"
        className="island p-6 card-hover group block animate-fade-in-up stagger-1"
      >
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Plus className="size-6 text-primary group-hover:text-primary-foreground transition-colors" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{t('dashboard.createProject.title')}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {t('dashboard.createProject.description')}
            </p>
            <div className="mt-4 flex items-center text-primary text-sm font-medium">
              {t('dashboard.createProject.cta')}
              <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>

      {/* Recent Projects */}
      <div className="space-y-3 animate-fade-in-up stagger-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('dashboard.recentProjects')}
          </h2>
          <Link href="/projects" className="text-xs text-primary hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="island divide-y divide-border">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-1.5" />
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
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FolderOpen className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('common.languages', { count: project.languages })} · {project.updatedAt}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
              {/* Add project hint */}
              <Link
                href="/projects/new"
                className="flex items-center gap-3 p-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="size-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Plus className="size-4" />
                </div>
                <span className="text-sm">Add another project</span>
              </Link>
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="size-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <FolderOpen className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
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
