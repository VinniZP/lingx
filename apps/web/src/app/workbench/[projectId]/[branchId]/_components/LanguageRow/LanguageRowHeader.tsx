'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EmbeddedQualityScore } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ProjectLanguage } from '@lingx/shared';
import { Check, ChevronRight, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { QualityMeter, StatusBadge } from '../shared';

// Language code to flag emoji mapping
function getFlagEmoji(code: string): string {
  const flags: Record<string, string> = {
    en: '🇺🇸',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    it: '🇮🇹',
    pt: '🇵🇹',
    nl: '🇳🇱',
    pl: '🇵🇱',
    ru: '🇷🇺',
    ja: '🇯🇵',
    ko: '🇰🇷',
    zh: '🇨🇳',
    ar: '🇸🇦',
    tr: '🇹🇷',
    uk: '🇺🇦',
    cs: '🇨🇿',
    sv: '🇸🇪',
    da: '🇩🇰',
    fi: '🇫🇮',
    no: '🇳🇴',
  };
  return flags[code.toLowerCase()] || '🌐';
}

interface LanguageRowHeaderProps {
  language: ProjectLanguage;
  isExpanded: boolean;
  onToggle: () => void;
  value: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'empty';
  qualityScore: EmbeddedQualityScore | null;
  isSaving: boolean;
  isSaved: boolean;
  canApprove: boolean;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onFetchMT: () => void;
  onFetchAI: () => void;
  isFetchingMT: boolean;
  isFetchingAI: boolean;
  hasMT: boolean;
  hasAI: boolean;
}

export function LanguageRowHeader({
  language,
  isExpanded,
  onToggle,
  value,
  status,
  qualityScore,
  isSaving,
  isSaved,
  canApprove,
  isApproving,
  onApprove,
  onReject,
  onFetchMT,
  onFetchAI,
  isFetchingMT,
  isFetchingAI,
  hasMT,
  hasAI,
}: LanguageRowHeaderProps) {
  const hasValue = Boolean(value);

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
        isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'
      )}
      onClick={onToggle}
    >
      {/* Expand indicator */}
      <ChevronRight
        className={cn(
          'text-muted-foreground size-4 transition-transform',
          isExpanded && 'rotate-90'
        )}
      />

      {/* Language info */}
      <span className="text-lg">{getFlagEmoji(language.code)}</span>
      <span className="w-20 text-sm font-medium">{language.name}</span>

      {/* Status & Quality */}
      <StatusBadge status={status} size="sm" />
      {qualityScore && (
        <QualityMeter
          score={qualityScore.score}
          dimensions={{
            accuracy: qualityScore.accuracy ?? undefined,
            fluency: qualityScore.fluency ?? undefined,
            terminology: qualityScore.terminology ?? undefined,
            format: qualityScore.format,
          }}
          size="sm"
        />
      )}

      {/* Preview (when collapsed) */}
      {!isExpanded && hasValue && (
        <p className="text-muted-foreground flex-1 truncate text-xs">{value}</p>
      )}
      {!isExpanded && !hasValue && (
        <p className="text-muted-foreground/50 flex-1 text-xs italic">No translation</p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save indicator */}
      {isSaving && (
        <span className="text-muted-foreground bg-muted/50 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs">
          <Loader2 className="size-3 animate-spin" />
          Saving
        </span>
      )}
      {isSaved && !isSaving && (
        <span className="text-success bg-success/10 animate-fade-in-up flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs">
          <Check className="size-3" />
          Saved
        </span>
      )}

      {/* Quick actions */}
      <div
        className={cn(
          'flex items-center gap-1 transition-opacity',
          isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {hasMT && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onFetchMT}
                disabled={isFetchingMT}
              >
                {isFetchingMT ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Wand2 className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent kbd="⌘M">Machine Translate</TooltipContent>
          </Tooltip>
        )}

        {hasAI && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onFetchAI}
                disabled={isFetchingAI}
              >
                {isFetchingAI ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent kbd="⌘I">AI Translate</TooltipContent>
          </Tooltip>
        )}

        {canApprove && hasValue && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-success hover:text-success size-7"
                  onClick={onApprove}
                  disabled={isApproving || status === 'APPROVED'}
                >
                  {isApproving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent kbd="⌘⏎">Approve</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-7"
                  onClick={onReject}
                  disabled={isApproving || status === 'REJECTED'}
                >
                  <X className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent kbd="⌘⌫">Reject</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}
