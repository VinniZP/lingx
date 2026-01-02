'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getBranchQualitySummary, type BranchQualitySummary } from '@/lib/api/quality';
import { cn } from '@/lib/utils';

interface QualitySummaryProps {
  branchId: string;
  className?: string;
}

/**
 * Quality Summary Widget
 *
 * Premium island widget showing translation quality statistics:
 * - Average score for branch (large stat number)
 * - Distribution bars (excellent/good/needs review)
 * - Breakdown by language
 * - Total scored vs total translations
 *
 * Uses React Query for data fetching with smart caching.
 */
export function QualitySummary({ branchId, className }: QualitySummaryProps) {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['quality-summary', branchId],
    queryFn: () => getBranchQualitySummary(branchId),
    // Quality scores don't change frequently, cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <QualitySummarySkeleton className={className} />;
  }

  if (error || !summary) {
    return null; // Silently fail for optional quality data
  }

  // Calculate percentages for distribution
  const total = summary.totalScored;
  const percentages = {
    excellent: total > 0 ? Math.round((summary.distribution.excellent / total) * 100) : 0,
    good: total > 0 ? Math.round((summary.distribution.good / total) * 100) : 0,
    needsReview: total > 0 ? Math.round((summary.distribution.needsReview / total) * 100) : 0,
  };

  // Determine overall quality level
  const qualityLevel =
    summary.averageScore >= 80 ? 'excellent' : summary.averageScore >= 60 ? 'good' : 'needsReview';

  const qualityConfig = {
    excellent: {
      label: 'Excellent',
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      ring: 'ring-emerald-200/50 dark:ring-emerald-800/50',
      glow: 'shadow-[0_0_32px_-4px_rgba(16,185,129,0.25)] dark:shadow-[0_0_32px_-4px_rgba(52,211,153,0.15)]',
    },
    good: {
      label: 'Good',
      icon: CheckCircle2,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      ring: 'ring-amber-200/50 dark:ring-amber-800/50',
      glow: 'shadow-[0_0_32px_-4px_rgba(245,158,11,0.25)] dark:shadow-[0_0_32px_-4px_rgba(251,191,36,0.15)]',
    },
    needsReview: {
      label: 'Needs Attention',
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      ring: 'ring-rose-200/50 dark:ring-rose-800/50',
      glow: 'shadow-[0_0_32px_-4px_rgba(244,63,94,0.25)] dark:shadow-[0_0_32px_-4px_rgba(251,113,133,0.15)]',
    },
  };

  const config = qualityConfig[qualityLevel];
  const Icon = config.icon;

  // Sort languages by average score (descending)
  const sortedLanguages = Object.entries(summary.byLanguage).sort(
    ([, a], [, b]) => b.average - a.average
  );

  return (
    <div className={cn('island p-6 space-y-6 animate-fade-in-up', config.glow, className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-4 text-primary" strokeWidth={2} />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Translation Quality
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.totalScored.toLocaleString()} of {summary.totalTranslations.toLocaleString()}{' '}
            evaluated
          </p>
        </div>

        {/* Overall quality indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1',
            config.bg,
            config.color,
            config.ring
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.5} />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Average Score - Hero Number */}
      <div className="relative">
        <div className={cn('inline-flex items-baseline gap-2 group')}>
          <span
            className={cn(
              'text-6xl font-bold tabular-nums tracking-tighter',
              config.color,
              'transition-transform group-hover:scale-105'
            )}
          >
            {summary.averageScore}
          </span>
          <span className="text-2xl font-medium text-muted-foreground">/100</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Average quality score</p>
      </div>

      {/* Distribution Bars */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Distribution
        </h4>

        {/* Excellent */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="text-muted-foreground">Excellent (≥80)</span>
            </div>
            <span className="font-semibold tabular-nums">
              {summary.distribution.excellent}
              <span className="text-xs text-muted-foreground ml-1">({percentages.excellent}%)</span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentages.excellent}%` }}
            />
          </div>
        </div>

        {/* Good */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-amber-500 dark:bg-amber-400" />
              <span className="text-muted-foreground">Good (60-79)</span>
            </div>
            <span className="font-semibold tabular-nums">
              {summary.distribution.good}
              <span className="text-xs text-muted-foreground ml-1">({percentages.good}%)</span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentages.good}%` }}
            />
          </div>
        </div>

        {/* Needs Review */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-rose-500 dark:bg-rose-400" />
              <span className="text-muted-foreground">Needs Review (&lt;60)</span>
            </div>
            <span className="font-semibold tabular-nums">
              {summary.distribution.needsReview}
              <span className="text-xs text-muted-foreground ml-1">
                ({percentages.needsReview}%)
              </span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 dark:bg-rose-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentages.needsReview}%` }}
            />
          </div>
        </div>
      </div>

      {/* By Language */}
      {sortedLanguages.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-border/50">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            By Language
          </h4>
          <div className="space-y-2">
            {sortedLanguages.slice(0, 5).map(([lang, data]) => (
              <div key={lang} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground uppercase">{lang}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {data.count} {data.count === 1 ? 'translation' : 'translations'}
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      data.average >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : data.average >= 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {data.average}
                  </span>
                </div>
              </div>
            ))}
            {sortedLanguages.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{sortedLanguages.length - 5} more languages
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Quality Summary Skeleton
 *
 * Loading placeholder matching the real component's structure
 */
export function QualitySummarySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('island p-6 space-y-6 animate-fade-in-up', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Average Score */}
      <div className="space-y-2">
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Distribution Bars */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* By Language */}
      <div className="space-y-3 pt-3 border-t border-border/50">
        <Skeleton className="h-3 w-24" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
