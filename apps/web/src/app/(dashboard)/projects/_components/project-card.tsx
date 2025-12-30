'use client';

import Link from 'next/link';
import { FolderOpen, Key, Globe2, Clock, GitBranch } from 'lucide-react';
import { useTranslation } from '@localeflow/sdk-nextjs';
import type { ProjectWithStats } from '@localeflow/shared';

interface ProjectCardProps {
  project: ProjectWithStats;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const { t } = useTranslation();
  const { stats } = project;
  const progressPercent = Math.round(stats.completionRate * 100);

  return (
    <Link href={`/projects/${project.id}`}>
      <div className={`island p-6 card-hover group h-full animate-fade-in-up stagger-${Math.min(index + 2, 6)}`}>
        {/* Header with icon and date */}
        <div className="flex items-start justify-between mb-5">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
            <FolderOpen className="size-6 text-primary group-hover:text-primary-foreground transition-colors" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Project name and slug */}
        <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        <p className="text-sm text-muted-foreground font-mono mb-5">
          {project.slug}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-5 text-sm text-muted-foreground mb-5">
          <div className="flex items-center gap-2">
            <Key className="size-4" />
            <span>{t('projects.card.keys', { count: stats.totalKeys })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe2 className="size-4" />
            <span>{project.languages.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="size-4" />
            <span>{t('projects.card.main')}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('projects.card.progress')}</span>
            <span className="font-medium text-success">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Language badges */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
          {project.languages.slice(0, 4).map((lang) => (
            <span
              key={lang.code}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
                lang.isDefault
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {lang.code}
            </span>
          ))}
          {project.languages.length > 4 && (
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground">
              +{project.languages.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
