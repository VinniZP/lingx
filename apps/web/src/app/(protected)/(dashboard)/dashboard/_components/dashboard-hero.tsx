'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { DashboardStats } from '@lingx/shared';

interface DashboardHeroProps {
  displayName: string;
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

export function DashboardHero({ displayName, stats, isLoading }: DashboardHeroProps) {
  const { t } = useTranslation();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  const completionPercentage = stats ? Math.round(stats.completionRate * 100) : 0;
  const hasProjects = stats && stats.totalProjects > 0;

  return (
    <div className="island animate-fade-in-up p-6 lg:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            {greeting()}, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.overview')}</p>
        </div>

        {/* Stats Row - Inline */}
        <div className="flex flex-wrap items-center gap-8 lg:gap-12">
          <StatItem
            label={t('dashboard.stats.projects')}
            value={stats?.totalProjects ?? 0}
            isLoading={isLoading}
          />
          <div className="bg-border hidden h-10 w-px sm:block" />
          <StatItem
            label={t('dashboard.stats.keys')}
            value={stats?.totalKeys ?? 0}
            isLoading={isLoading}
            format="number"
          />
          <div className="bg-border hidden h-10 w-px sm:block" />
          <StatItem
            label={t('dashboard.stats.languages')}
            value={stats?.totalLanguages ?? 0}
            isLoading={isLoading}
          />
          <div className="bg-border hidden h-10 w-px sm:block" />
          <StatItem
            label={t('dashboard.stats.complete')}
            value={completionPercentage}
            isLoading={isLoading}
            suffix="%"
            className="text-success"
          />
          {(stats?.pendingApprovalCount ?? 0) > 0 && (
            <>
              <div className="bg-border hidden h-10 w-px sm:block" />
              <StatItem
                label={t('dashboard.stats.pending', { defaultValue: 'Pending' })}
                value={stats?.pendingApprovalCount ?? 0}
                isLoading={isLoading}
                format="number"
                className="text-warning"
              />
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {hasProjects && (
        <div className="border-border mt-6 border-t pt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('dashboard.progress')}</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="from-primary to-primary/70 h-full rounded-full bg-linear-to-r transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  isLoading: boolean;
  format?: 'number' | 'default';
  suffix?: string;
  className?: string;
}

function StatItem({ label, value, isLoading, format, suffix, className }: StatItemProps) {
  const displayValue = format === 'number' ? value.toLocaleString() : value;

  return (
    <div className="text-center">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
      {isLoading ? (
        <Skeleton className="mx-auto mt-1 h-8 w-12" />
      ) : (
        <p className={`mt-1 text-3xl font-semibold tracking-tight ${className ?? ''}`}>
          {displayValue}
          {suffix}
        </p>
      )}
    </div>
  );
}
