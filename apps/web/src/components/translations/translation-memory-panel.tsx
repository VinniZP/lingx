'use client';

import { useState, useEffect } from 'react';
import { useTranslationMemorySearch, useRecordTMUsage, type TMMatch } from '@/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database, Loader2, Copy, CheckCircle2, Sparkles } from 'lucide-react';

interface TranslationMemoryPanelProps {
  projectId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  onApplyMatch: (targetText: string, matchId: string) => void;
  isVisible?: boolean;
}

/**
 * Sidebar panel showing Translation Memory matches.
 * Suggests previously translated text with similarity scores.
 */
export function TranslationMemoryPanel({
  projectId,
  sourceText,
  sourceLanguage,
  targetLanguage,
  onApplyMatch,
  isVisible = true,
}: TranslationMemoryPanelProps) {
  const [debouncedSourceText, setDebouncedSourceText] = useState(sourceText);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Debounce source text changes (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSourceText(sourceText);
    }, 500);
    return () => clearTimeout(timer);
  }, [sourceText]);

  // Don't search if source and target language are the same
  const shouldSearch = sourceLanguage !== targetLanguage && debouncedSourceText.length >= 3;

  const { data, isLoading } = useTranslationMemorySearch(
    projectId,
    shouldSearch
      ? {
          sourceText: debouncedSourceText,
          sourceLanguage,
          targetLanguage,
          minSimilarity: 0.6, // 60% minimum similarity for useful matches
          limit: 5,
        }
      : null,
    { enabled: isVisible && shouldSearch }
  );

  const recordUsage = useRecordTMUsage(projectId);

  const handleApply = (match: TMMatch) => {
    onApplyMatch(match.targetText, match.id);
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
  if (!sourceText || sourceText.length < 3) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Translation Memory</span>
        </div>
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter at least 3 characters in the source language
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            to see translation suggestions
          </p>
        </div>
      </div>
    );
  }

  const matches = data?.matches ?? [];
  const exactMatches = matches.filter((m) => m.matchType === 'exact');
  const fuzzyMatches = matches.filter((m) => m.matchType === 'fuzzy');

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Database className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Translation Memory</span>
        {isLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Loading state */}
      {isLoading && matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Searching...</p>
        </div>
      )}

      {/* No matches */}
      {!isLoading && matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Database className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No matches found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Approve translations to build memory
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
                Exact Matches
              </div>
              {exactMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onApply={handleApply}
                  isApplied={appliedId === match.id}
                />
              ))}
            </div>
          )}

          {/* Fuzzy matches */}
          {fuzzyMatches.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Similar Matches
              </div>
              {fuzzyMatches.map((match) => (
                <MatchCard
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

interface MatchCardProps {
  match: TMMatch;
  onApply: (match: TMMatch) => void;
  isApplied: boolean;
}

function MatchCard({ match, onApply, isApplied }: MatchCardProps) {
  const similarityPercent = Math.round(match.similarity * 100);
  const isExact = match.matchType === 'exact';

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      {/* Header with similarity badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            isExact
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-warning/10 text-warning border border-warning/20'
          )}
        >
          {similarityPercent}%
        </span>
        <span className="text-xs text-muted-foreground">
          Used {match.usageCount}x
        </span>
      </div>

      {/* Source text (truncated) */}
      <div className="text-xs text-muted-foreground line-clamp-2">
        {match.sourceText}
      </div>

      {/* Target text (full) */}
      <div className="text-sm font-medium">{match.targetText}</div>

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
            Applied
          </>
        ) : (
          <>
            <Copy className="size-4" />
            Apply
          </>
        )}
      </Button>
    </div>
  );
}
