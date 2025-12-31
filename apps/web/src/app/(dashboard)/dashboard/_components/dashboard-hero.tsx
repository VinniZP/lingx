'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@localeflow/sdk-nextjs';
import type { DashboardStats } from '@localeflow/shared';

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
    <div className="island p-6 lg:p-8 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
            {greeting()}, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Stats Row - Inline */}
        <div className="flex flex-wrap items-center gap-8 lg:gap-12">
          <StatItem
            label={t('dashboard.stats.projects')}
            value={stats?.totalProjects ?? 0}
            isLoading={isLoading}
          />
          <div className="w-px h-10 bg-border hidden sm:block" />
          <StatItem
            label={t('dashboard.stats.keys')}
            value={stats?.totalKeys ?? 0}
            isLoading={isLoading}
            format="number"
          />
          <div className="w-px h-10 bg-border hidden sm:block" />
          <StatItem
            label={t('dashboard.stats.languages')}
            value={stats?.totalLanguages ?? 0}
            isLoading={isLoading}
          />
          <div className="w-px h-10 bg-border hidden sm:block" />
          <StatItem
            label={t('dashboard.stats.complete')}
            value={completionPercentage}
            isLoading={isLoading}
            suffix="%"
            className="text-success"
          />
          {(stats?.pendingApprovalCount ?? 0) > 0 && (
            <>
              <div className="w-px h-10 bg-border hidden sm:block" />
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
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('dashboard.progress')}</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
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
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {isLoading ? (
        <Skeleton className="h-8 w-12 mt-1 mx-auto" />
      ) : (
        <p className={`text-3xl font-semibold tracking-tight mt-1 ${className ?? ''}`}>
          {displayValue}{suffix}
        </p>
      )}
    </div>
  );
}
