'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useGlossarySearch, useRecordGlossaryUsage, type GlossaryMatch } from '@/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, CheckCircle2, Tag, BookOpen } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GlossaryTabProps {
  projectId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguages: string[];
  onApplyMatch: (targetLang: string, text: string, matchId: string) => void;
}

export function GlossaryTab({
  projectId,
  sourceText,
  sourceLanguage,
  targetLanguages,
  onApplyMatch,
}: GlossaryTabProps) {
  const [debouncedSourceText, setDebouncedSourceText] = useState(sourceText);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Debounce source text changes (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSourceText(sourceText);
    }, 300);
    return () => clearTimeout(timer);
  }, [sourceText]);

  const handleApply = (lang: string, match: GlossaryMatch) => {
    onApplyMatch(lang, match.targetTerm, match.id);
    setAppliedId(match.id);
    setTimeout(() => setAppliedId(null), 2000);
  };

  // Empty state - no source text
  if (!sourceText || sourceText.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
          <BookOpen className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Enter source text to find glossary terms</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {targetLanguages.map((lang) => (
        <GlossaryLanguageSection
          key={lang}
          projectId={projectId}
          sourceText={debouncedSourceText}
          sourceLanguage={sourceLanguage}
          targetLanguage={lang}
          onApply={(match) => handleApply(lang, match)}
          appliedId={appliedId}
        />
      ))}
    </div>
  );
}

interface GlossaryLanguageSectionProps {
  projectId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  onApply: (match: GlossaryMatch) => void;
  appliedId: string | null;
}

function GlossaryLanguageSection({
  projectId,
  sourceText,
  sourceLanguage,
  targetLanguage,
  onApply,
  appliedId,
}: GlossaryLanguageSectionProps) {
  const shouldSearch = sourceText.length >= 2;

  const { data, isLoading } = useGlossarySearch(
    projectId,
    shouldSearch
      ? {
          sourceText,
          sourceLanguage,
          targetLanguage,
          limit: 5,
        }
      : null,
    { enabled: shouldSearch }
  );

  const recordUsage = useRecordGlossaryUsage(projectId);

  const handleApply = (match: GlossaryMatch) => {
    recordUsage.mutate(match.id);
    onApply(match);
  };

  const matches = data?.matches ?? [];

  // No matches for this language
  if (!isLoading && matches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {targetLanguage}
        </p>
        {isLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="space-y-1.5">
        {matches.slice(0, 3).map((match) => (
          <TermCard
            key={match.id}
            match={match}
            onApply={() => handleApply(match)}
            isApplied={appliedId === match.id}
          />
        ))}
      </div>
    </div>
  );
}

interface TermCardProps {
  match: GlossaryMatch;
  onApply: () => void;
  isApplied: boolean;
}

function TermCard({ match, onApply, isApplied }: TermCardProps) {
  const isExact = match.matchType === 'exact';
  const posLabel = match.partOfSpeech
    ? match.partOfSpeech.toLowerCase().replace(/_/g, ' ')
    : null;

  return (
    <div className="group flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-primary/5 transition-colors">
      {/* Match type indicator */}
      <div
        className={cn(
          'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
          isExact
            ? 'bg-success/20 text-success'
            : 'bg-primary/20 text-primary'
        )}
      >
        {isExact ? 'exact' : 'found'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Source → Target */}
        <div className="flex items-center gap-1 text-xs">
          <span className="font-mono truncate">{match.sourceTerm}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium truncate">{match.targetTerm}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 flex-wrap">
          {posLabel && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
              {posLabel}
            </Badge>
          )}
          {match.domain && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5">
              <Tag className="size-2" />
              {match.domain}
            </Badge>
          )}
          {match.caseSensitive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                  Aa
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Case sensitive</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Apply button */}
      <Button
        size="sm"
        variant={isApplied ? 'outline' : 'ghost'}
        className="shrink-0 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onApply}
        disabled={isApplied}
      >
        {isApplied ? (
          <CheckCircle2 className="size-3.5 text-success" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
