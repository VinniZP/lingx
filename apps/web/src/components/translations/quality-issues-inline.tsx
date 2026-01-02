'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityIssue } from '@/lib/api/quality';

interface QualityIssuesInlineProps {
  issues?: QualityIssue[];
  validationError?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Inline quality issues display
 *
 * Shows validation status and issues below translation fields
 * Matches PRD Section 6.1 format
 */
export function QualityIssuesInline({
  issues = [],
  validationError,
  className,
  compact = false,
}: QualityIssuesInlineProps) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const hasIssues = errors.length > 0 || warnings.length > 0 || validationError;

  if (!hasIssues && !compact) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-xs', className)}>
      {/* ICU Syntax Error */}
      {validationError && (
        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="size-3.5" />
          <span className="font-medium">ICU syntax error:</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Error Issues */}
      {errors.map((issue, idx) => (
        <div key={`error-${idx}`} className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="size-3.5" />
          <span className="font-medium">{getIssueLabel(issue.type)}:</span>
          <span>{issue.message}</span>
        </div>
      ))}

      {/* Warning Issues */}
      {warnings.map((issue, idx) => (
        <div key={`warning-${idx}`} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertCircle className="size-3.5" />
          <span className="font-medium">{getIssueLabel(issue.type)}:</span>
          <span>{issue.message}</span>
        </div>
      ))}

      {/* Success indicators (if no issues and compact mode) */}
      {!hasIssues && compact && (
        <>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>ICU syntax valid</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>Placeholders preserved</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Get human-readable label for issue type
 */
function getIssueLabel(type: string): string {
  const labels: Record<string, string> = {
    placeholder_missing: 'Missing placeholder',
    placeholder_extra: 'Extra placeholder',
    whitespace_leading: 'Leading whitespace',
    whitespace_trailing: 'Trailing whitespace',
    whitespace_double: 'Double whitespace',
    whitespace_tab: 'Tab character',
    punctuation_mismatch: 'Punctuation mismatch',
    length_too_long: 'Length warning',
    length_critical: 'Length critical',
    icu_syntax: 'ICU syntax',
    glossary_missing: 'Missing glossary term',
    accuracy: 'Accuracy',
    fluency: 'Fluency',
    terminology: 'Terminology',
  };

  return labels[type] || type;
}
