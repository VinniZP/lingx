'use client';

import { Badge } from '@/components/ui/badge';
import { Brain, Check, AlertTriangle, Sparkles } from 'lucide-react';

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
    en: '🇺🇸', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹',
    pt: '🇵🇹', nl: '🇳🇱', pl: '🇵🇱', ru: '🇷🇺', ja: '🇯🇵',
    ko: '🇰🇷', zh: '🇨🇳', ar: '🇸🇦', tr: '🇹🇷', uk: '🇺🇦',
    cs: '🇨🇿', sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', no: '🇳🇴',
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
    return suggestions
      .filter((s) => s.type === 'ai')
      .map((s) => ({ ...s, lang }));
  });

  if (aiSuggestions.length === 0) {
    return (
      <div className="space-y-3">
        {/* Placeholder tips - larger and more readable */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-info/8 border border-info/20">
          <Brain className="size-5 text-info mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-info">Consistency Check</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use AI to check for consistent terminology across translations
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-success/8 border border-success/20">
          <Check className="size-5 text-success mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-success">Glossary Compliance</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI suggestions follow project glossary terms
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/8 border border-warning/20">
          <AlertTriangle className="size-5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">Style Guide</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
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
          className="group p-3 rounded-lg bg-primary/8 border border-primary/20 cursor-pointer hover:bg-primary/12 hover:border-primary/40 transition-all duration-200"
        >
          {/* Header with language and provider */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
              <span className="text-sm">{getFlagEmoji(suggestion.lang)}</span>
              <span className="text-[10px] font-semibold uppercase">{suggestion.lang}</span>
            </div>
            {suggestion.provider && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Sparkles className="size-3" />
                <span>{suggestion.provider}</span>
              </div>
            )}
          </div>

          {/* Suggestion text - readable but compact */}
          <p className="text-sm font-mono leading-snug text-foreground line-clamp-2">
            {suggestion.text}
          </p>
        </div>
      ))}
    </div>
  );
}
