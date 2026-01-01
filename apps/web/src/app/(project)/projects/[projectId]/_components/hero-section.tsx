'use client';

import Link from 'next/link';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { StatPill } from './stat-pill';
import type { ProjectResponse } from '@localeflow/shared';

interface HeroSectionProps {
  project: ProjectResponse;
  projectId: string;
  totalKeys: number | undefined;
  completionPercentage: number;
  statsLoading: boolean;
  defaultBranchId?: string;
  defaultBranchName?: string;
}

/**
 * HeroSection - Project info with stats and CTA
 */
export function HeroSection({
  project,
  projectId,
  totalKeys,
  completionPercentage,
  statsLoading,
  defaultBranchId,
  defaultBranchName,
}: HeroSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="island p-6 lg:p-8 animate-fade-in-up">
      {/* Row 1: Name + Inline Stats */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left: Project Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            /{project.slug}
          </p>
          {project.description && (
            <p className="text-muted-foreground mt-3 max-w-xl">
              {project.description}
            </p>
          )}
        </div>

        {/* Right: Inline Stats */}
        <div className="flex flex-wrap items-center gap-6 lg:gap-10">
          <StatPill
            label={t('dashboard.stats.languages')}
            value={project.languages.length}
          />
          <div className="w-px h-8 bg-border hidden sm:block" />
          <StatPill
            label={t('dashboard.stats.keys')}
            value={statsLoading ? '-' : totalKeys || 0}
          />
          <div className="w-px h-8 bg-border hidden sm:block" />
          <StatPill
            label={t('dashboard.stats.complete')}
            value={statsLoading ? '-' : `${completionPercentage}%`}
            highlight={completionPercentage === 100}
          />
        </div>
      </div>

      {/* Row 2: Full-width CTA */}
      {defaultBranchId && (
        <div className="mt-6 pt-6 border-t border-border">
          <Link
            href={`/projects/${projectId}/translations/${defaultBranchId}`}
            className="group flex flex-col sm:flex-row items-start sm:items-center justify-between w-full p-5 rounded-xl bg-linear-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/15 hover:via-primary/10 border border-primary/20 transition-all gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('projectDetail.startTranslating')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('projectDetail.editOnBranch', { branchName: defaultBranchName ?? '' })}
                </p>
              </div>
            </div>
            <Button className="gap-2 group-hover:gap-3 transition-all w-full sm:w-auto">
              {t('projectDetail.openEditor')}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
