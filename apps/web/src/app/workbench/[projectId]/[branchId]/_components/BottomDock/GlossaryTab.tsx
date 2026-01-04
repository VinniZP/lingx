'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGlossarySearch, useRecordGlossaryUsage, type GlossaryMatch } from '@/hooks';
import { cn } from '@/lib/utils';
import { BookOpen, CheckCircle2, Copy, Loader2, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';

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
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="bg-muted/50 mb-2 flex size-10 items-center justify-center rounded-xl">
          <BookOpen className="text-muted-foreground size-5" />
        </div>
        <p className="text-muted-foreground text-sm">Enter source text to find glossary terms</p>
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
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {targetLanguage}
        </p>
        {isLoading && <Loader2 className="text-muted-foreground size-3 animate-spin" />}
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
  const posLabel = match.partOfSpeech ? match.partOfSpeech.toLowerCase().replace(/_/g, ' ') : null;

  return (
    <div className="group bg-muted/30 hover:bg-primary/5 flex items-start gap-2 rounded-lg p-2 transition-colors">
      {/* Match type indicator */}
      <div
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
          isExact ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
        )}
      >
        {isExact ? 'exact' : 'found'}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Source → Target */}
        <div className="flex items-center gap-1 text-xs">
          <span className="truncate font-mono">{match.sourceTerm}</span>
          <span className="text-muted-foreground">→</span>
          <span className="truncate font-medium">{match.targetTerm}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1">
          {posLabel && (
            <Badge variant="secondary" className="h-4 px-1 py-0 text-[9px]">
              {posLabel}
            </Badge>
          )}
          {match.domain && (
            <Badge variant="outline" className="h-4 gap-0.5 px-1 py-0 text-[9px]">
              <Tag className="size-2" />
              {match.domain}
            </Badge>
          )}
          {match.caseSensitive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="h-4 px-1 py-0 text-[9px]">
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
        className="h-7 shrink-0 px-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onApply}
        disabled={isApplied}
      >
        {isApplied ? (
          <CheckCircle2 className="text-success size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
