'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface UnifiedSuggestion {
  id: string;
  type: 'tm' | 'mt' | 'ai';
  text: string;
  confidence: number;
  source?: string;
}

interface TMMatchesTabProps {
  keyId: string;
  targetLanguages: string[];
  getSuggestions: (keyId: string) => Map<string, UnifiedSuggestion[]>;
  fetchingLanguages?: Set<string>;
}

export function TMMatchesTab({
  keyId,
  targetLanguages,
  getSuggestions,
  fetchingLanguages,
}: TMMatchesTabProps) {
  // Collect all TM matches by language
  const suggestionsMap = getSuggestions(keyId);
  const matchesByLang = targetLanguages
    .map((lang) => {
      const suggestions = suggestionsMap.get(lang) || [];
      const tmMatches = suggestions.filter((s) => s.type === 'tm');
      return { lang, matches: tmMatches };
    })
    .filter((item) => item.matches.length > 0);

  const isLoading = fetchingLanguages && fetchingLanguages.size > 0;

  if (matchesByLang.length === 0) {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 gap-3">
          {Array.from(fetchingLanguages)
            .slice(0, 4)
            .map((lang) => (
              <div key={lang} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="text-muted-foreground size-3 animate-spin" />
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {lang}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            ))}
        </div>
      );
    }
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        No translation memory matches found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {matchesByLang.map(({ lang, matches }) => (
        <div key={lang} className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {lang}
          </p>
          <div className="space-y-1.5">
            {matches.slice(0, 3).map((match) => (
              <div
                key={match.id}
                className="group bg-muted/30 hover:bg-primary/5 flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors"
              >
                {/* Confidence badge */}
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                    match.confidence >= 95
                      ? 'bg-success/20 text-success'
                      : match.confidence >= 80
                        ? 'bg-info/20 text-info'
                        : 'bg-warning/20 text-warning'
                  )}
                >
                  {match.confidence}%
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  {match.source && (
                    <p className="text-muted-foreground mb-0.5 truncate text-[10px]">
                      {match.source}
                    </p>
                  )}
                  <p className="truncate text-xs">{match.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
