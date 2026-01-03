'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import type { TranslationKey } from '@/lib/api';

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
    <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-border bg-card">
      <div className="flex-1 min-w-0">
        {/* Namespace */}
        {keyData.namespace && (
          <Badge variant="outline" className="text-[10px] font-mono mb-1">
            {keyData.namespace}
          </Badge>
        )}

        {/* Key name */}
        <h2 className="text-lg font-semibold font-mono truncate" title={keyData.name}>
          {displayName}
        </h2>

        {/* Description */}
        {keyData.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {keyData.description}
          </p>
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
                className="h-8 text-primary hover:text-primary"
                onClick={onEvaluateQuality}
                disabled={isEvaluatingQuality}
              >
                {isEvaluatingQuality ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="size-4 mr-1.5" />
                )}
                {isEvaluatingQuality ? 'Evaluating...' : 'Evaluate Quality'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Evaluate quality for this key's translations</TooltipContent>
          </Tooltip>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
