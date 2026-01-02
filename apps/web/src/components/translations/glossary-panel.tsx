'use client';

import { useState, useEffect } from 'react';
import { useGlossarySearch, useRecordGlossaryUsage, type GlossaryMatch } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Loader2,
  Copy,
  CheckCircle2,
  Sparkles,
  Tag,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from '@lingx/sdk-nextjs';

interface GlossaryPanelProps {
  projectId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  onApplyMatch: (targetTerm: string, matchId: string) => void;
  isVisible?: boolean;
}

/**
 * Panel showing glossary term matches found in source text.
 * Displays terminology with metadata like part of speech and domain.
 */
export function GlossaryPanel({
  projectId,
  sourceText,
  sourceLanguage,
  targetLanguage,
  onApplyMatch,
  isVisible = true,
}: GlossaryPanelProps) {
  const { t } = useTranslation();
  const [debouncedSourceText, setDebouncedSourceText] = useState(sourceText);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Debounce source text changes (300ms - faster than TM since glossary is simpler)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSourceText(sourceText);
    }, 300);
    return () => clearTimeout(timer);
  }, [sourceText]);

  // Don't search if source and target language are the same
  const shouldSearch = sourceLanguage !== targetLanguage && debouncedSourceText.length >= 2;

  const { data, isLoading } = useGlossarySearch(
    projectId,
    shouldSearch
      ? {
          sourceText: debouncedSourceText,
          sourceLanguage,
          targetLanguage,
          limit: 10,
        }
      : null,
    { enabled: isVisible && shouldSearch }
  );

  const recordUsage = useRecordGlossaryUsage(projectId);

  const handleApply = (match: GlossaryMatch) => {
    onApplyMatch(match.targetTerm, match.id);
    recordUsage.mutate(match.id);
    setAppliedId(match.id);
    // Clear the applied indicator after 2 seconds
    setTimeout(() => setAppliedId(null), 2000);
  };

  // If source and target are the same, show nothing
  if (sourceLanguage === targetLanguage) {
    return null;
  }

  // Empty state when no source text
  if (!sourceText || sourceText.length < 2) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('translations.glossaryPanel.title')}</span>
        </div>
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('translations.glossaryPanel.enterSourceText')}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('translations.glossaryPanel.matchingTerminology')}
          </p>
        </div>
      </div>
    );
  }

  const matches = data?.matches ?? [];
  const exactMatches = matches.filter((m) => m.matchType === 'exact');
  const partialMatches = matches.filter((m) => m.matchType === 'partial');

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('translations.glossaryPanel.title')}</span>
        {isLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        {matches.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {matches.length}
          </Badge>
        )}
      </div>

      {/* Loading state */}
      {isLoading && matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{t('translations.glossaryPanel.searchingGlossary')}</p>
        </div>
      )}

      {/* No matches */}
      {!isLoading && matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <BookOpen className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{t('translations.glossaryPanel.noTermsFound')}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('translations.glossaryPanel.addTermsHint')}
          </p>
        </div>
      )}

      {/* Matches */}
      {matches.length > 0 && (
        <div className="space-y-3">
          {/* Exact matches */}
          {exactMatches.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('translations.glossaryPanel.exactMatches')}
              </div>
              {exactMatches.map((match) => (
                <TermCard
                  key={match.id}
                  match={match}
                  onApply={handleApply}
                  isApplied={appliedId === match.id}
                />
              ))}
            </div>
          )}

          {/* Partial matches */}
          {partialMatches.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('translations.glossaryPanel.termFoundInText')}
              </div>
              {partialMatches.map((match) => (
                <TermCard
                  key={match.id}
                  match={match}
                  onApply={handleApply}
                  isApplied={appliedId === match.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TermCardProps {
  match: GlossaryMatch;
  onApply: (match: GlossaryMatch) => void;
  isApplied: boolean;
}

function TermCard({ match, onApply, isApplied }: TermCardProps) {
  const { t } = useTranslation();
  const isExact = match.matchType === 'exact';

  // Format part of speech for display
  const posLabel = match.partOfSpeech
    ? match.partOfSpeech.toLowerCase().replace(/_/g, ' ')
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      {/* Header with term and metadata */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          {/* Source term */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {match.sourceTerm}
            </span>
            {match.caseSensitive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    Aa
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{t('translations.glossaryPanel.caseSensitive')}</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Part of speech and domain badges */}
          <div className="flex items-center gap-1 flex-wrap">
            {posLabel && (
              <Badge variant="secondary" className="text-[10px]">
                {posLabel}
              </Badge>
            )}
            {match.domain && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Tag className="size-2.5" />
                {match.domain}
              </Badge>
            )}
          </div>
        </div>

        {/* Match type indicator */}
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
            isExact
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-primary/10 text-primary border border-primary/20'
          )}
        >
          {isExact ? t('translations.glossaryPanel.exact') : t('translations.glossaryPanel.found')}
        </span>
      </div>

      {/* Arrow and target term */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">→</span>
        <span className="font-medium text-sm">{match.targetTerm}</span>
      </div>

      {/* Context or notes */}
      {(match.context || match.notes) && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
          <Info className="size-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{match.context || match.notes}</span>
        </div>
      )}

      {/* Apply button */}
      <Button
        size="sm"
        variant={isApplied ? 'outline' : 'secondary'}
        className="w-full gap-2"
        onClick={() => onApply(match)}
        disabled={isApplied}
      >
        {isApplied ? (
          <>
            <CheckCircle2 className="size-4 text-success" />
            {t('translations.glossaryPanel.applied')}
          </>
        ) : (
          <>
            <Copy className="size-4" />
            {t('translations.glossaryPanel.applyTerm')}
          </>
        )}
      </Button>
    </div>
  );
}
