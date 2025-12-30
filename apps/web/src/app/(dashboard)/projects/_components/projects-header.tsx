'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import type { ProjectWithStats } from '@/lib/api';

interface ProjectsHeaderProps {
  projects: ProjectWithStats[];
}

export function ProjectsHeader({ projects }: ProjectsHeaderProps) {
  const { t } = useTranslation();

  // Calculate aggregate stats
  const totalKeys = projects.reduce((sum, p) => sum + p.stats.totalKeys, 0);
  const allLanguages = new Set<string>();
  projects.forEach(p => p.languages.forEach(l => allLanguages.add(l.code)));

  return (
    <div className="island p-6 lg:p-8 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">{t('projects.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('projects.description')}
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-8 lg:gap-12">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('dashboard.stats.projects')}</p>
            <p className="text-2xl font-semibold tabular-nums">{projects.length}</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('dashboard.stats.languages')}</p>
            <p className="text-2xl font-semibold tabular-nums">{allLanguages.size}</p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('projects.stats.totalKeys')}</p>
            <p className="text-2xl font-semibold tabular-nums">{totalKeys.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
