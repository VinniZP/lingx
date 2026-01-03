'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TranslationKey } from '@/lib/api';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';

interface KeyHeaderProps {
  keyData: TranslationKey;
  onDelete?: () => void;
  onEvaluateQuality?: () => void;
  isEvaluatingQuality?: boolean;
}

export function KeyHeader({
  keyData,
  onDelete,
  onEvaluateQuality,
  isEvaluatingQuality,
}: KeyHeaderProps) {
  const displayName = keyData.namespace
    ? keyData.name.replace(`${keyData.namespace}.`, '')
    : keyData.name;

  return (
    <div className="border-border bg-card flex items-start justify-between gap-4 border-b px-4 py-3">
      <div className="min-w-0 flex-1">
        {/* Namespace */}
        {keyData.namespace && (
          <Badge variant="outline" className="mb-1 font-mono text-[10px]">
            {keyData.namespace}
          </Badge>
        )}

        {/* Key name */}
        <h2 className="truncate font-mono text-lg font-semibold" title={keyData.name}>
          {displayName}
        </h2>

        {/* Description */}
        {keyData.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{keyData.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onEvaluateQuality && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary h-8"
                onClick={onEvaluateQuality}
                disabled={isEvaluatingQuality}
              >
                {isEvaluatingQuality ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-4" />
                )}
                {isEvaluatingQuality ? 'Evaluating...' : 'Evaluate Quality'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Evaluate quality for this key&apos;s translations</TooltipContent>
          </Tooltip>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-8"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
