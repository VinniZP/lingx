'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectWithStats } from '@lingx/shared';
import { Clock, FolderOpen, GitBranch, Globe2, Key } from 'lucide-react';
import Link from 'next/link';

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
      <div
        className={`island card-hover group animate-fade-in-up h-full p-6 stagger-${Math.min(index + 2, 6)}`}
      >
        {/* Header with icon and date */}
        <div className="mb-5 flex items-start justify-between">
          <div className="bg-primary/10 group-hover:bg-primary flex size-12 items-center justify-center rounded-xl transition-colors">
            <FolderOpen className="text-primary group-hover:text-primary-foreground size-6 transition-colors" />
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Clock className="size-3.5" />
            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Project name and slug */}
        <h3 className="group-hover:text-primary mb-1 text-base font-semibold transition-colors">
          {project.name}
        </h3>
        <p className="text-muted-foreground mb-5 font-mono text-sm">{project.slug}</p>

        {/* Stats row */}
        <div className="text-muted-foreground mb-5 flex items-center gap-5 text-sm">
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
            <span>main</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('projects.card.progress')}</span>
            <span className="text-success font-medium">{progressPercent}%</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-success h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Language badges */}
        <div className="border-border mt-5 flex flex-wrap gap-2 border-t pt-5">
          {project.languages.slice(0, 4).map((lang) => (
            <span
              key={lang.code}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide uppercase ${
                lang.isDefault ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {lang.code}
            </span>
          ))}
          {project.languages.length > 4 && (
            <span className="bg-muted text-muted-foreground rounded-md px-2.5 py-1 text-xs font-semibold">
              +{project.languages.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
