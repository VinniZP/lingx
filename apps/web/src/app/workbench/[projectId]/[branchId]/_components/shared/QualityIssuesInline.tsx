'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { QualityIssue } from '@/lib/api/quality';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface QualityIssuesInlineProps {
  issues: QualityIssue[];
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  info: {
    icon: Info,
    className: 'bg-info/10 text-info border-info/20',
  },
};

export function QualityIssuesInline({ issues }: QualityIssuesInlineProps) {
  if (!issues.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {issues.map((issue, index) => {
        const config = severityConfig[issue.severity];
        const Icon = config.icon;

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex cursor-help items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                  config.className
                )}
              >
                <Icon className="size-3" />
                <span className="max-w-[150px] truncate">{issue.message.split(':')[0]}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{issue.message}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
