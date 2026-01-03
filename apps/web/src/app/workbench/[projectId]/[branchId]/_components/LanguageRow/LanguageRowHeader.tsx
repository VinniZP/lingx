'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronRight,
  Wand2,
  Sparkles,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import type { ProjectLanguage } from '@lingx/shared';
import type { EmbeddedQualityScore } from '@/lib/api';
import { StatusBadge, QualityMeter } from '../shared';

// Language code to flag emoji mapping
function getFlagEmoji(code: string): string {
  const flags: Record<string, string> = {
    en: '🇺🇸', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹',
    pt: '🇵🇹', nl: '🇳🇱', pl: '🇵🇱', ru: '🇷🇺', ja: '🇯🇵',
    ko: '🇰🇷', zh: '🇨🇳', ar: '🇸🇦', tr: '🇹🇷', uk: '🇺🇦',
    cs: '🇨🇿', sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', no: '🇳🇴',
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
        'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
        isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'
      )}
      onClick={onToggle}
    >
      {/* Expand indicator */}
      <ChevronRight
        className={cn(
          'size-4 text-muted-foreground transition-transform',
          isExpanded && 'rotate-90'
        )}
      />

      {/* Language info */}
      <span className="text-lg">{getFlagEmoji(language.code)}</span>
      <span className="text-sm font-medium w-20">{language.name}</span>

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
        <p className="flex-1 text-xs text-muted-foreground truncate">
          {value}
        </p>
      )}
      {!isExpanded && !hasValue && (
        <p className="flex-1 text-xs text-muted-foreground/50 italic">
          No translation
        </p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save indicator */}
      {isSaving && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          <Loader2 className="size-3 animate-spin" />
          Saving
        </span>
      )}
      {isSaved && !isSaving && (
        <span className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full animate-fade-in-up">
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
                  className="size-7 text-success hover:text-success"
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
                  className="size-7 text-destructive hover:text-destructive"
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
