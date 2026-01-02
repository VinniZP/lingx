'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { QualityIssue, QualityCheckResult } from '@lingx/shared';
import { useTranslation, tKey, type TKey } from '@lingx/sdk-nextjs';

interface QualityIssuesProps {
  issues: QualityIssue[];
  className?: string;
  /** Compact mode shows only a single icon with count */
  compact?: boolean;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    className: 'text-destructive',
    bgClassName: 'bg-destructive/10',
    labelKey: tKey('translations.qualityIssues.error'),
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-warning',
    bgClassName: 'bg-warning/10',
    labelKey: tKey('translations.qualityIssues.warning'),
  },
  info: {
    icon: Info,
    className: 'text-muted-foreground',
    bgClassName: 'bg-muted',
    labelKey: tKey('translations.qualityIssues.info'),
  },
} as const;

// Issue type label keys for i18n with tKey() for static extraction
const issueTypeLabelKeys: Record<string, TKey> = {
  placeholder_missing: tKey('translations.qualityIssues.placeholderMissing'),
  placeholder_extra: tKey('translations.qualityIssues.placeholderExtra'),
  whitespace_leading: tKey('translations.qualityIssues.whitespaceLeading'),
  whitespace_trailing: tKey('translations.qualityIssues.whitespaceTrailing'),
  whitespace_double: tKey('translations.qualityIssues.whitespaceDouble'),
  whitespace_tab: tKey('translations.qualityIssues.whitespaceTab'),
  punctuation_mismatch: tKey('translations.qualityIssues.punctuationMismatch'),
};

/**
 * Displays quality issues with severity icons and tooltips.
 * Used inline in translation editors to show placeholder, whitespace, and punctuation issues.
 */
export function QualityIssues({ issues, className, compact = false }: QualityIssuesProps) {
  const { t, td } = useTranslation();

  if (!issues || issues.length === 0) {
    return null;
  }

  // Group by severity for compact mode
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  // Compact mode: show single icon with highest severity
  if (compact) {
    const highestSeverity = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'info';
    const config = severityConfig[highestSeverity];
    const Icon = config.icon;
    const total = issues.length;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              config.bgClassName,
              config.className,
              className
            )}
          >
            <Icon className="size-3.5" />
            <span>{total}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{t('translations.qualityIssues.title', { count: total })}</p>
            <ul className="text-xs space-y-0.5">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className={cn('shrink-0 mt-0.5', severityConfig[issue.severity].className)}>
                    {issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '!' : '○'}
                  </span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full mode: show each issue
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {issues.map((issue, idx) => {
        const config = severityConfig[issue.severity];
        const Icon = config.icon;
        const labelKey = issueTypeLabelKeys[issue.type];

        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center justify-center',
                  'size-5 rounded-full',
                  config.bgClassName,
                  config.className
                )}
              >
                <Icon className="size-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-0.5">
                <p className="font-medium text-xs">{labelKey ? td(labelKey) : issue.type}</p>
                <p className="text-xs text-muted-foreground">{issue.message}</p>
                {issue.context?.placeholder && (
                  <p className="text-xs font-mono text-muted-foreground">
                    {issue.context.placeholder}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

interface QualityBadgeProps {
  result: QualityCheckResult;
  className?: string;
}

/**
 * Shows a summary badge for quality check results.
 * Green = no issues, amber = warnings only, red = has errors.
 */
export function QualityBadge({ result, className }: QualityBadgeProps) {
  if (!result.issues || result.issues.length === 0) {
    return null;
  }

  if (result.hasErrors) {
    return (
      <QualityIssues issues={result.issues} compact className={className} />
    );
  }

  if (result.hasWarnings) {
    return (
      <QualityIssues issues={result.issues} compact className={className} />
    );
  }

  return null;
}
