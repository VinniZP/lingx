'use client';

import { TranslationKey, ProjectLanguage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

interface TranslationKeyCardProps {
  translationKey: TranslationKey;
  languages: ProjectLanguage[];
  isSelected: boolean;
  onClick: () => void;
  getTranslationValue: (key: TranslationKey, lang: string) => string;
}

export function TranslationKeyCard({
  translationKey,
  languages,
  isSelected,
  onClick,
  getTranslationValue,
}: TranslationKeyCardProps) {
  // Calculate completion status
  const translatedCount = languages.filter(
    (lang) => !!getTranslationValue(translationKey, lang.code)
  ).length;
  const totalLanguages = languages.length;
  const isComplete = translatedCount === totalLanguages;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all',
        'hover:bg-muted/50',
        isSelected
          ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
          : 'bg-card border-border/50 hover:border-border'
      )}
    >
      {/* Key name */}
      <div className="font-mono text-sm font-medium truncate">
        {translationKey.name}
      </div>

      {/* Description */}
      {translationKey.description && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {translationKey.description}
        </div>
      )}

      {/* Language status indicators */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {languages.slice(0, 6).map((lang) => {
          const hasTranslation = !!getTranslationValue(translationKey, lang.code);
          return (
            <div
              key={lang.code}
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-0.5 rounded-md',
                hasTranslation
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {hasTranslation ? (
                <Check className="size-3" />
              ) : (
                <Circle className="size-3" />
              )}
              <span className="uppercase font-medium">{lang.code}</span>
            </div>
          );
        })}
        {languages.length > 6 && (
          <span className="text-xs text-muted-foreground">
            +{languages.length - 6}
          </span>
        )}
      </div>

      {/* Progress indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isComplete ? 'bg-success' : 'bg-primary'
            )}
            style={{ width: `${(translatedCount / totalLanguages) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {translatedCount}/{totalLanguages}
        </span>
      </div>
    </button>
  );
}
