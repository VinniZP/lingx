'use client';

import * as React from 'react';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { QualityScore } from '@/lib/api/quality';

interface QualityScoreBadgeProps {
  score: QualityScore;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDimensions?: boolean;
}

/**
 * Quality Score Badge Component
 *
 * Displays translation quality score (0-100) with premium pill design.
 * Color-coded by score range:
 * - Green (>=80): Excellent quality
 * - Yellow (60-79): Good quality
 * - Red (<60): Needs review
 *
 * Shows sparkles icon for AI-evaluated scores.
 * Tooltip displays evaluation type and dimension breakdown.
 */
export function QualityScoreBadge({
  score,
  size = 'md',
  className,
  showDimensions = false,
}: QualityScoreBadgeProps) {
  const scoreValue = score.score;
  const isAIEvaluated = score.evaluationType === 'ai' || score.evaluationType === 'hybrid';

  // Color coding based on score ranges
  const scoreColors = React.useMemo(() => {
    if (scoreValue >= 80) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        ring: 'ring-emerald-200/50 dark:ring-emerald-800/50',
        icon: 'text-emerald-600 dark:text-emerald-500',
        glow: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.3)] dark:shadow-[0_0_20px_-4px_rgba(52,211,153,0.2)]',
      };
    } else if (scoreValue >= 60) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-400',
        ring: 'ring-amber-200/50 dark:ring-amber-800/50',
        icon: 'text-amber-600 dark:text-amber-500',
        glow: 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.3)] dark:shadow-[0_0_20px_-4px_rgba(251,191,36,0.2)]',
      };
    } else {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        text: 'text-rose-700 dark:text-rose-400',
        ring: 'ring-rose-200/50 dark:ring-rose-800/50',
        icon: 'text-rose-600 dark:text-rose-500',
        glow: 'shadow-[0_0_20px_-4px_rgba(244,63,94,0.3)] dark:shadow-[0_0_20px_-4px_rgba(251,113,133,0.2)]',
      };
    }
  }, [scoreValue]);

  // Size variants
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-0.5',
    md: 'text-xs px-2.5 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  };

  const iconSizes = {
    sm: 'size-2.5',
    md: 'size-3',
    lg: 'size-3.5',
  };

  const evaluationTypeLabel = {
    heuristic: 'Heuristic evaluation',
    ai: 'AI evaluation',
    hybrid: 'Hybrid (AI + Heuristic)',
  }[score.evaluationType];

  const StatusIcon = scoreValue >= 80 ? TrendingUp : scoreValue >= 60 ? Sparkles : AlertCircle;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'inline-flex items-center font-semibold rounded-full ring-1 transition-all duration-200',
            scoreColors.bg,
            scoreColors.text,
            scoreColors.ring,
            sizeClasses[size],
            isAIEvaluated && scoreColors.glow,
            className
          )}
        >
          {/* AI Sparkles indicator */}
          {isAIEvaluated && (
            <Sparkles
              className={cn(iconSizes[size], scoreColors.icon, 'animate-pulse')}
              strokeWidth={2.5}
            />
          )}

          {/* Score value */}
          <span className="tabular-nums font-bold">{scoreValue}</span>

          {/* Status icon */}
          <StatusIcon className={cn(iconSizes[size], scoreColors.icon)} strokeWidth={2.5} />
        </div>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        className="w-[300px] p-0 overflow-hidden bg-popover/95 backdrop-blur-sm border-border/50 shadow-xl"
      >
        {/* Header with score and status */}
        <div className={cn(
          "px-4 py-3 border-b border-border/30",
          scoreValue >= 80
            ? "bg-gradient-to-r from-emerald-500/10 to-transparent"
            : scoreValue >= 60
              ? "bg-gradient-to-r from-amber-500/10 to-transparent"
              : "bg-gradient-to-r from-rose-500/10 to-transparent"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "flex items-center justify-center size-8 rounded-lg",
                scoreValue >= 80
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : scoreValue >= 60
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              )}>
                <StatusIcon className="size-4" strokeWidth={2} />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">
                  {scoreValue >= 80 ? 'Excellent Quality' : scoreValue >= 60 ? 'Good Quality' : 'Needs Review'}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  {isAIEvaluated && <Sparkles className="size-2.5" />}
                  <span>{evaluationTypeLabel}</span>
                  {score.cached && (
                    <span className="px-1 py-0.5 rounded bg-muted/50 text-[9px] uppercase tracking-wider">cached</span>
                  )}
                </div>
              </div>
            </div>
            <div className={cn(
              "text-2xl font-bold tabular-nums",
              scoreValue >= 80
                ? "text-emerald-600 dark:text-emerald-400"
                : scoreValue >= 60
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
            )}>
              {scoreValue}
            </div>
          </div>
        </div>

        {/* Dimension breakdown with progress bars - compact when issues present */}
        {showDimensions && (score.accuracy !== undefined || score.fluency !== undefined || score.terminology !== undefined || score.format !== undefined) && (
          <div className={cn(
            "px-4 border-b border-border/30",
            score.issues.length > 0 ? "py-2 space-y-1.5" : "py-3 space-y-2.5"
          )}>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Quality Dimensions
            </div>
            {score.issues.length > 0 ? (
              /* Compact inline layout when issues present */
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {[
                  { label: 'Acc', value: score.accuracy },
                  { label: 'Flu', value: score.fluency },
                  { label: 'Term', value: score.terminology },
                  { label: 'Fmt', value: score.format },
                ].filter(d => d.value !== undefined).map((dimension) => (
                  <div key={dimension.label} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground">{dimension.label}</span>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      dimension.value! >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : dimension.value! >= 60
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    )}>
                      {dimension.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Full layout with progress bars when no issues */
              <div className="space-y-2">
                {[
                  { label: 'Accuracy', value: score.accuracy, weight: '40%' },
                  { label: 'Fluency', value: score.fluency, weight: '25%' },
                  { label: 'Terminology', value: score.terminology, weight: '15%' },
                  { label: 'Format', value: score.format, weight: '20%' },
                ].filter(d => d.value !== undefined).map((dimension) => (
                  <div key={dimension.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{dimension.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground/60">{dimension.weight}</span>
                        <span className={cn(
                          "font-semibold tabular-nums w-6 text-right",
                          dimension.value! >= 80
                            ? "text-emerald-600 dark:text-emerald-400"
                            : dimension.value! >= 60
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                        )}>
                          {dimension.value}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 ease-out",
                          dimension.value! >= 80
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : dimension.value! >= 60
                              ? "bg-gradient-to-r from-amber-500 to-amber-400"
                              : "bg-gradient-to-r from-rose-500 to-rose-400"
                        )}
                        style={{ width: `${dimension.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Issues list with refined styling */}
        {score.issues.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="size-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {score.issues.length} Issue{score.issues.length > 1 ? 's' : ''} Detected
              </span>
            </div>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {score.issues.map((issue, idx) => (
                <li
                  key={idx}
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm leading-snug",
                    issue.severity === 'error'
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : issue.severity === 'warning'
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "bg-muted/30 text-muted-foreground"
                  )}
                >
                  <span className="shrink-0 mt-0.5">
                    {issue.severity === 'error' ? (
                      <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.77 10.36a1 1 0 01-1.41 1.41L8 9.41l-2.36 2.36a1 1 0 11-1.41-1.41L6.59 8 4.23 5.64a1 1 0 011.41-1.41L8 6.59l2.36-2.36a1 1 0 111.41 1.41L9.41 8l2.36 2.36z"/>
                      </svg>
                    ) : issue.severity === 'warning' ? (
                      <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6.845.962a1.333 1.333 0 012.31 0l6.566 11.37a1.333 1.333 0 01-1.155 2.001H1.434a1.333 1.333 0 01-1.155-2L6.845.962zM8 5.333a1 1 0 00-1 1v2.667a1 1 0 002 0V6.333a1 1 0 00-1-1zm0 6.667a1 1 0 100-2 1 1 0 000 2z"/>
                      </svg>
                    ) : (
                      <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="6" strokeWidth="2" stroke="currentColor" fill="none" opacity="0.5"/>
                      </svg>
                    )}
                  </span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state when no dimensions and no issues */}
        {!showDimensions && score.issues.length === 0 && (
          <div className="px-4 py-2.5 text-[11px] text-muted-foreground text-center">
            No issues detected
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Quality Score Skeleton
 *
 * Loading placeholder for quality score badge
 */
export function QualityScoreBadgeSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const widthClasses = {
    sm: 'w-11',
    md: 'w-12',
    lg: 'w-14',
  };

  const heightClasses = {
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-6',
  };

  return (
    <div
      className={cn(
        'inline-block rounded-full bg-muted/50 animate-pulse',
        widthClasses[size],
        heightClasses[size]
      )}
    />
  );
}
