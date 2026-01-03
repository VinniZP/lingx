'use client';

import { AlertTriangle, Brain, Check, Sparkles } from 'lucide-react';

interface UnifiedSuggestion {
  id: string;
  type: 'tm' | 'mt' | 'ai';
  text: string;
  confidence: number;
  provider?: string;
}

interface AISuggestionsTabProps {
  keyId: string;
  targetLanguages: string[];
  getSuggestions: (keyId: string) => Map<string, UnifiedSuggestion[]>;
}

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

export function AISuggestionsTab({
  keyId,
  targetLanguages,
  getSuggestions,
}: AISuggestionsTabProps) {
  // Collect AI suggestions
  const suggestionsMap = getSuggestions(keyId);
  const aiSuggestions = targetLanguages.flatMap((lang) => {
    const suggestions = suggestionsMap.get(lang) || [];
    return suggestions.filter((s) => s.type === 'ai').map((s) => ({ ...s, lang }));
  });

  if (aiSuggestions.length === 0) {
    return (
      <div className="space-y-3">
        {/* Placeholder tips - larger and more readable */}
        <div className="bg-info/8 border-info/20 flex items-start gap-3 rounded-xl border p-3">
          <Brain className="text-info mt-0.5 size-5 flex-shrink-0" />
          <div>
            <p className="text-info text-sm font-medium">Consistency Check</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Use AI to check for consistent terminology across translations
            </p>
          </div>
        </div>

        <div className="bg-success/8 border-success/20 flex items-start gap-3 rounded-xl border p-3">
          <Check className="text-success mt-0.5 size-5 flex-shrink-0" />
          <div>
            <p className="text-success text-sm font-medium">Glossary Compliance</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              AI suggestions follow project glossary terms
            </p>
          </div>
        </div>

        <div className="bg-warning/8 border-warning/20 flex items-start gap-3 rounded-xl border p-3">
          <AlertTriangle className="text-warning mt-0.5 size-5 flex-shrink-0" />
          <div>
            <p className="text-warning text-sm font-medium">Style Guide</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Consider formal vs informal tone for target audience
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {aiSuggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="group bg-primary/8 border-primary/20 hover:bg-primary/12 hover:border-primary/40 cursor-pointer rounded-lg border p-3 transition-all duration-200"
        >
          {/* Header with language and provider */}
          <div className="mb-1.5 flex items-center gap-2">
            <div className="bg-primary/15 text-primary flex items-center gap-1 rounded-full px-1.5 py-0.5">
              <span className="text-sm">{getFlagEmoji(suggestion.lang)}</span>
              <span className="text-[10px] font-semibold uppercase">{suggestion.lang}</span>
            </div>
            {suggestion.provider && (
              <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <Sparkles className="size-3" />
                <span>{suggestion.provider}</span>
              </div>
            )}
          </div>

          {/* Suggestion text - readable but compact */}
          <p className="text-foreground line-clamp-2 font-mono text-sm leading-snug">
            {suggestion.text}
          </p>
        </div>
      ))}
    </div>
  );
}
