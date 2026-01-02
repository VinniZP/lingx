'use client';

import Link from 'next/link';
import { FolderOpen, Key, Globe2, Clock, ArrowRight } from 'lucide-react';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectWithStats } from '@lingx/shared';

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
      className="flex items-center gap-5 p-5 hover:bg-muted/50 transition-colors group"
    >
      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <FolderOpen className="size-6 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <span className="text-sm text-muted-foreground font-mono hidden sm:inline">
            {project.slug}
          </span>
        </div>
        <div className="flex items-center gap-5 mt-1.5 text-sm text-muted-foreground">
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
      <div className="hidden md:flex items-center gap-3 w-36">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm font-medium text-success w-10">{progressPercent}%</span>
      </div>

      {/* Languages preview */}
      <div className="hidden lg:flex items-center gap-1.5">
        {project.languages.slice(0, 3).map((lang) => (
          <span
            key={lang.code}
            className="px-2 py-1 rounded-md text-xs font-semibold uppercase bg-muted text-muted-foreground"
          >
            {lang.code}
          </span>
        ))}
        {project.languages.length > 3 && (
          <span className="text-sm text-muted-foreground ml-1">+{project.languages.length - 3}</span>
        )}
      </div>

      {/* Updated date */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground w-28 justify-end">
        <Clock className="size-4" />
        {new Date(project.updatedAt).toLocaleDateString()}
      </div>

      <ArrowRight className="size-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
