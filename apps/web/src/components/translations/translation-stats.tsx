'use client';

import type { ProjectLanguage } from '@localeflow/shared';
import { TranslationKey } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TrendingUp, Clock, Languages } from 'lucide-react';

// Language flags mapping
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  ar: '🇸🇦',
  ru: '🇷🇺',
  nl: '🇳🇱',
  pl: '🇵🇱',
  uk: '🇺🇦',
};

interface TranslationStatsProps {
  keys: TranslationKey[];
  languages: ProjectLanguage[];
  getTranslationValue: (key: TranslationKey, lang: string) => string;
}

export function TranslationStats({
  keys,
  languages,
  getTranslationValue,
}: TranslationStatsProps) {
  // Calculate stats per language
  const languageStats = languages.map((lang) => {
    const translatedCount = keys.filter(
      (key) => !!getTranslationValue(key, lang.code)
    ).length;
    const percentage = keys.length > 0 ? Math.round((translatedCount / keys.length) * 100) : 0;
    return {
      ...lang,
      flag: LANGUAGE_FLAGS[lang.code] || '🌐',
      translatedCount,
      percentage,
    };
  });

  // Overall completion
  const totalTranslations = languages.length * keys.length;
  const completedTranslations = languageStats.reduce(
    (sum, lang) => sum + lang.translatedCount,
    0
  );
  const overallPercentage =
    totalTranslations > 0
      ? Math.round((completedTranslations / totalTranslations) * 100)
      : 0;

  // Find most recent update
  const sortedKeys = [...keys].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const recentKey = sortedKeys[0];

  return (
    <div className="island p-6 space-y-6 animate-fade-in-up stagger-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" />
          Translation Coverage
        </h3>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">
            {overallPercentage}% complete
          </span>
        </div>
      </div>

      {/* Language progress bars */}
      <div className="grid gap-3">
        {languageStats.map((lang) => (
          <div key={lang.code} className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-28 shrink-0">
              <span className="text-base">{lang.flag}</span>
              <span className="text-sm font-medium truncate">{lang.name}</span>
            </div>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  lang.percentage === 100
                    ? 'bg-success'
                    : lang.percentage >= 50
                    ? 'bg-primary'
                    : 'bg-warning'
                )}
                style={{ width: `${lang.percentage}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-16 text-right font-mono">
              {lang.translatedCount}/{keys.length}
            </span>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      {recentKey && (
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>Last updated:</span>
            <span className="font-mono text-foreground">{recentKey.name}</span>
            <span>
              {new Date(recentKey.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{keys.length}</div>
          <div className="text-xs text-muted-foreground">Total Keys</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{languages.length}</div>
          <div className="text-xs text-muted-foreground">Languages</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">{overallPercentage}%</div>
          <div className="text-xs text-muted-foreground">Complete</div>
        </div>
      </div>
    </div>
  );
}
