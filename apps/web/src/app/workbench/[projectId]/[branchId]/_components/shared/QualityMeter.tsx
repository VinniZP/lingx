'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QualityDimensions {
  accuracy?: number;
  fluency?: number;
  terminology?: number;
  format?: number;
}

interface QualityMeterProps {
  score: number | null | undefined;
  dimensions?: QualityDimensions;
  size?: 'sm' | 'default';
  showLabel?: boolean;
}

export function QualityMeter({
  score,
  dimensions,
  size = 'default',
  showLabel = false,
}: QualityMeterProps) {
  if (score === null || score === undefined) {
    return (
      <div className={cn(
        'flex gap-0.5',
        size === 'sm' ? 'w-12' : 'w-15'
      )}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-[1px] bg-muted',
              size === 'sm' ? 'h-1' : 'h-1.5'
            )}
          />
        ))}
      </div>
    );
  }

  const getSegmentColor = (index: number, filled: boolean) => {
    if (!filled) return 'bg-muted';
    if (index < 2) return score < 50 ? 'bg-destructive' : 'bg-warning';
    if (index < 4) return score < 70 ? 'bg-warning' : 'bg-success';
    return 'bg-success';
  };

  const thresholds = [20, 40, 60, 80, 95];
  const filledSegments = thresholds.map((t) => score >= t);

  const meter = (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex gap-0.5 group/meter',
          size === 'sm' ? 'w-12' : 'w-15'
        )}
      >
        {filledSegments.map((filled, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-[1px] transition-all duration-200',
              size === 'sm' ? 'h-1' : 'h-1.5',
              getSegmentColor(i, filled),
              filled && 'group-hover/meter:scale-y-150'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn(
          'font-mono tabular-nums',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive'
        )}>
          {score}%
        </span>
      )}
    </div>
  );

  if (!dimensions) return meter;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {meter}
      </TooltipTrigger>
      <TooltipContent side="top" className="p-0 w-48">
        <QualityDimensionTooltip dimensions={dimensions} score={score} />
      </TooltipContent>
    </Tooltip>
  );
}

function QualityDimensionTooltip({
  dimensions,
  score,
}: {
  dimensions: QualityDimensions;
  score: number;
}) {
  const items = [
    { label: 'Accuracy', value: dimensions.accuracy },
    { label: 'Fluency', value: dimensions.fluency },
    { label: 'Terminology', value: dimensions.terminology },
    { label: 'Format', value: dimensions.format },
  ].filter((item) => item.value !== undefined);

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Quality Score</span>
        <span className={cn(
          'text-sm font-bold tabular-nums',
          score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive'
        )}>
          {score}%
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-20">{item.label}</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  item.value! >= 80 ? 'bg-success' : item.value! >= 50 ? 'bg-warning' : 'bg-destructive'
                )}
                style={{ width: `${item.value}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums w-8 text-right">
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
