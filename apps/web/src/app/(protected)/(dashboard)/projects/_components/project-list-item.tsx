'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectWithStats } from '@lingx/shared';
import { ArrowRight, Clock, FolderOpen, Globe2, Key } from 'lucide-react';
import Link from 'next/link';

interface ProjectListItemProps {
  project: ProjectWithStats;
}

export function ProjectListItem({ project }: ProjectListItemProps) {
  const { t } = useTranslation();
  const { stats } = project;
  const progressPercent = Math.round(stats.completionRate * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="hover:bg-muted/50 group flex items-center gap-5 p-5 transition-colors"
    >
      <div className="bg-primary/10 group-hover:bg-primary/20 flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors">
        <FolderOpen className="text-primary size-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="group-hover:text-primary truncate text-base font-semibold transition-colors">
            {project.name}
          </h3>
          <span className="text-muted-foreground hidden font-mono text-sm sm:inline">
            {project.slug}
          </span>
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center gap-5 text-sm">
          <span className="flex items-center gap-2">
            <Key className="size-4" />
            {t('projects.card.keys', { count: stats.totalKeys })}
          </span>
          <span className="flex items-center gap-2">
            <Globe2 className="size-4" />
            {t('common.languages', { count: project.languages.length })}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="hidden w-36 items-center gap-3 md:flex">
        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-success h-full rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-success w-10 text-sm font-medium">{progressPercent}%</span>
      </div>

      {/* Languages preview */}
      <div className="hidden items-center gap-1.5 lg:flex">
        {project.languages.slice(0, 3).map((lang) => (
          <span
            key={lang.code}
            className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-semibold uppercase"
          >
            {lang.code}
          </span>
        ))}
        {project.languages.length > 3 && (
          <span className="text-muted-foreground ml-1 text-sm">
            +{project.languages.length - 3}
          </span>
        )}
      </div>

      {/* Updated date */}
      <div className="text-muted-foreground hidden w-28 items-center justify-end gap-2 text-sm sm:flex">
        <Clock className="size-4" />
        {new Date(project.updatedAt).toLocaleDateString()}
      </div>

      <ArrowRight className="text-muted-foreground size-5 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
