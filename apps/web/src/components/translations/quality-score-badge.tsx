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

  // Format dimension scores for tooltip
  const dimensionText = React.useMemo(() => {
    const parts: string[] = [];
    if (score.accuracy !== undefined) parts.push(`Accuracy: ${score.accuracy}`);
    if (score.fluency !== undefined) parts.push(`Fluency: ${score.fluency}`);
    if (score.terminology !== undefined) parts.push(`Terminology: ${score.terminology}`);
    if (score.format !== undefined) parts.push(`Format: ${score.format}`);
    return parts.length > 0 ? parts.join(' • ') : null;
  }, [score]);

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

      <TooltipContent side="top" className="max-w-[280px]">
        <div className="space-y-1.5">
          {/* Score interpretation */}
          <div className="font-semibold">
            {scoreValue >= 80 ? 'Excellent Quality' : scoreValue >= 60 ? 'Good Quality' : 'Needs Review'}
          </div>

          {/* Evaluation type */}
          <div className="text-[10px] opacity-75">
            {evaluationTypeLabel}
            {score.cached && ' (cached)'}
          </div>

          {/* Dimension breakdown */}
          {showDimensions && dimensionText && (
            <div className="text-[10px] opacity-75 pt-1 border-t border-current/20">
              {dimensionText}
            </div>
          )}

          {/* Issues count */}
          {score.issues.length > 0 && (
            <div className="text-[10px] opacity-75 pt-1 border-t border-current/20">
              {score.issues.length} issue{score.issues.length > 1 ? 's' : ''} detected
            </div>
          )}
        </div>
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
