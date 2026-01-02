'use client';

import { useState, useEffect } from 'react';
import { useTranslationMemorySearch, useRecordTMUsage, type TMMatch } from '@/hooks';
import { useMTConfigs, useMTTranslate, getProviderDisplayName } from '@/hooks/use-machine-translation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database, Loader2, Copy, CheckCircle2, Sparkles, Languages, Zap } from 'lucide-react';
import type { MTProvider } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';

interface TranslationMemoryPanelProps {
  projectId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  onApplyMatch: (targetText: string, matchId: string) => void;
  isVisible?: boolean;
}

/**
 * Sidebar panel showing Translation Memory matches and Machine Translation.
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
  const { t } = useTranslation();
  const [debouncedSourceText, setDebouncedSourceText] = useState(sourceText);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [mtResult, setMtResult] = useState<{ text: string; provider: MTProvider; cached: boolean } | null>(null);
  const [mtApplied, setMtApplied] = useState(false);

  // Debounce source text changes (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSourceText(sourceText);
    }, 500);
    return () => clearTimeout(timer);
  }, [sourceText]);

  // Reset MT result when source text changes
  useEffect(() => {
    setMtResult(null);
    setMtApplied(false);
  }, [debouncedSourceText, targetLanguage]);

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

  // Check if MT is configured
  const { data: mtConfigsData } = useMTConfigs(projectId);
  const mtConfigs = mtConfigsData?.configs?.filter(c => c.isActive) || [];
  const hasMT = mtConfigs.length > 0;

  // MT translate mutation
  const mtTranslate = useMTTranslate(projectId);

  const recordUsage = useRecordTMUsage(projectId);

  const handleApply = (match: TMMatch) => {
    onApplyMatch(match.targetText, match.id);
    recordUsage.mutate(match.id);
    setAppliedId(match.id);
    // Clear the applied indicator after 2 seconds
    setTimeout(() => setAppliedId(null), 2000);
  };

  const handleMTTranslate = async () => {
    if (!debouncedSourceText || debouncedSourceText.length < 1) return;

    try {
      const result = await mtTranslate.mutateAsync({
        text: debouncedSourceText,
        sourceLanguage,
        targetLanguage,
      });
      setMtResult({
        text: result.translatedText,
        provider: result.provider,
        cached: result.cached,
      });
    } catch {
      // Error handling done by mutation
    }
  };

  const handleApplyMT = () => {
    if (mtResult) {
      onApplyMatch(mtResult.text, `mt-${mtResult.provider}`);
      setMtApplied(true);
      setTimeout(() => setMtApplied(false), 2000);
    }
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
          <span className="text-sm font-medium">{t('translations.memoryPanel.title')}</span>
        </div>
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('translations.memoryPanel.enterMinChars')}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('translations.memoryPanel.toSeeSuggestions')}
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
        <span className="text-sm font-medium">{t('translations.memoryPanel.title')}</span>
        {isLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Loading state */}
      {isLoading && matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{t('translations.memoryPanel.searching')}</p>
        </div>
      )}

      {/* No matches */}
      {!isLoading && matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Database className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{t('translations.memoryPanel.noMatches')}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('translations.memoryPanel.approveToBuildMemory')}
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
                {t('translations.memoryPanel.exactMatches')}
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
                {t('translations.memoryPanel.similarMatches')}
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

      {/* Machine Translation Section */}
      {hasMT && shouldSearch && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('translations.memoryPanel.machineTranslation')}</span>
          </div>

          {!mtResult ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleMTTranslate}
              disabled={mtTranslate.isPending}
            >
              {mtTranslate.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {mtTranslate.isPending ? t('translations.memoryPanel.translating') : t('translations.memoryPanel.getTranslation')}
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              {/* Provider badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  {getProviderDisplayName(mtResult.provider)}
                </span>
                {mtResult.cached && (
                  <span className="text-xs text-muted-foreground">
                    {t('translations.memoryPanel.cached')}
                  </span>
                )}
              </div>

              {/* Translated text */}
              <div className="text-sm font-medium">{mtResult.text}</div>

              {/* Apply button */}
              <Button
                size="sm"
                variant={mtApplied ? 'outline' : 'default'}
                className="w-full gap-2"
                onClick={handleApplyMT}
                disabled={mtApplied}
              >
                {mtApplied ? (
                  <>
                    <CheckCircle2 className="size-4 text-success" />
                    {t('translations.memoryPanel.applied')}
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    {t('translations.memoryPanel.apply')}
                  </>
                )}
              </Button>
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
  const { t } = useTranslation();
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
          {t('translations.memoryPanel.usedCount', { count: match.usageCount })}
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
            {t('translations.memoryPanel.applied')}
          </>
        ) : (
          <>
            <Copy className="size-4" />
            {t('translations.memoryPanel.apply')}
          </>
        )}
      </Button>
    </div>
  );
}
