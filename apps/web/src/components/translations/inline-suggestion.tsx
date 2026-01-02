'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Database, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UnifiedSuggestion } from '@/hooks/use-suggestions';
import { useTranslation } from '@lingx/sdk-nextjs';

interface InlineSuggestionProps {
  suggestions: UnifiedSuggestion[];
  onApply: (text: string, id: string) => void;
  onDismiss: () => void;
}

/**
 * Inline suggestion pill that appears below translation inputs.
 * Shows TM matches and MT suggestions in a compact, actionable format.
 */
export function InlineSuggestion({
  suggestions,
  onApply,
  onDismiss,
}: InlineSuggestionProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  if (suggestions.length === 0) return null;

  // Sort by confidence (TM 100% first, then high TM, then MT)
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    // Prioritize exact TM matches
    if (a.type === 'tm' && a.confidence === 100) return -1;
    if (b.type === 'tm' && b.confidence === 100) return 1;
    // Then by confidence
    return b.confidence - a.confidence;
  });

  const visibleSuggestions = showAll ? sortedSuggestions : sortedSuggestions.slice(0, 1);
  const hasMore = sortedSuggestions.length > 1;

  const handleApply = (suggestion: UnifiedSuggestion) => {
    setAppliedId(suggestion.id);
    onApply(suggestion.text, suggestion.id);
    // Clear applied state after animation
    setTimeout(() => setAppliedId(null), 1500);
  };

  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      {visibleSuggestions.map((suggestion) => {
        const isApplied = appliedId === suggestion.id;
        const isTM = suggestion.type === 'tm';
        const isExact = isTM && suggestion.confidence === 100;

        return (
          <div
            key={suggestion.id}
            className={cn(
              'flex items-start gap-2 p-2.5 rounded-lg border transition-all duration-200',
              isApplied
                ? 'bg-success/10 border-success/30'
                : 'bg-muted/30 border-border/50 hover:border-border'
            )}
          >
            {/* Type indicator */}
            <div
              className={cn(
                'shrink-0 flex items-center justify-center size-6 rounded-md',
                isTM
                  ? isExact
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isTM ? (
                <Database className="size-3.5" />
              ) : (
                <Zap className="size-3.5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header with badge */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                    isTM
                      ? isExact
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {isTM ? `${suggestion.confidence}% TM` : suggestion.provider || 'MT'}
                </span>
                {suggestion.source && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {t('translations.inlineSuggestion.from', { source: suggestion.source })}
                  </span>
                )}
                {suggestion.cached && (
                  <span className="text-[10px] text-muted-foreground">
                    {t('translations.inlineSuggestion.cached')}
                  </span>
                )}
              </div>

              {/* Suggestion text */}
              <p className="text-sm leading-relaxed line-clamp-2">
                {suggestion.text}
              </p>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-1">
              {isApplied ? (
                <div className="flex items-center gap-1.5 text-success text-xs font-medium px-2">
                  <Check className="size-3.5" />
                  {t('translations.inlineSuggestion.applied')}
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2.5 text-xs gap-1.5"
                    onClick={() => handleApply(suggestion)}
                  >
                    <Check className="size-3.5" />
                    {t('translations.inlineSuggestion.apply')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
                    onClick={onDismiss}
                    aria-label={t('translations.inlineSuggestion.dismiss')}
                  >
                    <X className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Show more/less toggle */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5',
            'text-xs text-muted-foreground hover:text-foreground',
            'transition-colors rounded-md hover:bg-muted/50'
          )}
        >
          {showAll ? (
            <>
              <ChevronUp className="size-3.5" />
              {t('translations.inlineSuggestion.showLess')}
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              {t('translations.inlineSuggestion.moreSuggestions', { count: sortedSuggestions.length - 1 })}
            </>
          )}
        </button>
      )}
    </div>
  );
}
