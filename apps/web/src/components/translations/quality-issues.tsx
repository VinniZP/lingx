'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { QualityIssue, QualityCheckResult } from '@localeflow/shared';

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
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-warning',
    bgClassName: 'bg-warning/10',
    label: 'Warning',
  },
  info: {
    icon: Info,
    className: 'text-muted-foreground',
    bgClassName: 'bg-muted',
    label: 'Info',
  },
} as const;

const issueTypeLabels: Record<string, string> = {
  placeholder_missing: 'Missing placeholder',
  placeholder_extra: 'Extra placeholder',
  whitespace_leading: 'Leading whitespace',
  whitespace_trailing: 'Trailing whitespace',
  whitespace_double: 'Double spaces',
  whitespace_tab: 'Tab character',
  punctuation_mismatch: 'Punctuation mismatch',
};

/**
 * Displays quality issues with severity icons and tooltips.
 * Used inline in translation editors to show placeholder, whitespace, and punctuation issues.
 */
export function QualityIssues({ issues, className, compact = false }: QualityIssuesProps) {
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
            <p className="font-medium">Quality Issues ({total})</p>
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
                <p className="font-medium text-xs">{issueTypeLabels[issue.type] || issue.type}</p>
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
