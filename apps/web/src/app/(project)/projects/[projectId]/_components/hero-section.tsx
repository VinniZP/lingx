'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectResponse } from '@lingx/shared';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { StatPill } from './stat-pill';

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
    <div className="island animate-fade-in-up p-6 lg:p-8">
      {/* Row 1: Name + Inline Stats */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: Project Info */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{project.name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">/{project.slug}</p>
          {project.description && (
            <p className="text-muted-foreground mt-3 max-w-xl">{project.description}</p>
          )}
        </div>

        {/* Right: Inline Stats */}
        <div className="flex flex-wrap items-center gap-6 lg:gap-10">
          <StatPill label={t('dashboard.stats.languages')} value={project.languages.length} />
          <div className="bg-border hidden h-8 w-px sm:block" />
          <StatPill label={t('dashboard.stats.keys')} value={statsLoading ? '-' : totalKeys || 0} />
          <div className="bg-border hidden h-8 w-px sm:block" />
          <StatPill
            label={t('dashboard.stats.complete')}
            value={statsLoading ? '-' : `${completionPercentage}%`}
            highlight={completionPercentage === 100}
          />
        </div>
      </div>

      {/* Row 2: Full-width CTA */}
      {defaultBranchId && (
        <div className="border-border mt-6 border-t pt-6">
          <Link
            href={`/workbench/${projectId}/${defaultBranchId}`}
            className="group from-primary/10 via-primary/5 hover:from-primary/15 hover:via-primary/10 border-primary/20 flex w-full flex-col items-start justify-between gap-4 rounded-xl border bg-linear-to-r to-transparent p-5 transition-all sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 flex size-12 shrink-0 items-center justify-center rounded-xl">
                <Sparkles className="text-primary size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('projectDetail.startTranslating')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('projectDetail.editOnBranch', { branchName: defaultBranchName ?? '' })}
                </p>
              </div>
            </div>
            <Button className="w-full gap-2 transition-all group-hover:gap-3 sm:w-auto">
              {t('projectDetail.openEditor')}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
