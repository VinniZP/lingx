'use client';

import { cn } from '@/lib/utils';

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
}

export function TMMatchesTab({
  keyId,
  targetLanguages,
  getSuggestions,
}: TMMatchesTabProps) {
  // Collect all TM matches by language
  const suggestionsMap = getSuggestions(keyId);
  const matchesByLang = targetLanguages.map((lang) => {
    const suggestions = suggestionsMap.get(lang) || [];
    const tmMatches = suggestions.filter((s) => s.type === 'tm');
    return { lang, matches: tmMatches };
  }).filter((item) => item.matches.length > 0);

  if (matchesByLang.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No translation memory matches found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {matchesByLang.map(({ lang, matches }) => (
        <div key={lang} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {lang}
          </p>
          <div className="space-y-1.5">
            {matches.slice(0, 3).map((match) => (
              <div
                key={match.id}
                className="group flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                {/* Confidence badge */}
                <div
                  className={cn(
                    'shrink-0 size-9 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums',
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
                <div className="flex-1 min-w-0">
                  {match.source && (
                    <p className="text-[10px] text-muted-foreground truncate mb-0.5">
                      {match.source}
                    </p>
                  )}
                  <p className="text-xs truncate">{match.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
