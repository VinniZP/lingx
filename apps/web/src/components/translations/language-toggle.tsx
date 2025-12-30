'use client';

import type { ProjectLanguage } from '@localeflow/shared';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  languages: ProjectLanguage[];
  sourceLanguage: string;
  targetLanguage: string;
  onSourceChange: (code: string) => void;
  onTargetChange: (code: string) => void;
}

export function LanguageToggle({
  languages,
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange,
}: LanguageToggleProps) {
  // Source is usually the default language, target is what we're editing
  const sourceOptions = languages.filter((l) => l.code !== targetLanguage);
  const targetOptions = languages.filter((l) => l.code !== sourceLanguage);

  return (
    <div className="flex items-center gap-1">
      {/* Source language - subtle */}
      <select
        value={sourceLanguage}
        onChange={(e) => onSourceChange(e.target.value)}
        className={cn(
          'appearance-none bg-transparent text-sm font-medium uppercase tracking-wider',
          'px-3 py-1.5 rounded-lg cursor-pointer',
          'text-muted-foreground hover:text-foreground transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
      >
        {sourceOptions.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.code}
          </option>
        ))}
      </select>

      {/* Target language - prominent */}
      <div className="flex items-center bg-primary rounded-lg overflow-hidden">
        {targetOptions.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onTargetChange(lang.code)}
            className={cn(
              'px-3 py-1.5 text-sm font-semibold uppercase tracking-wider transition-all',
              targetLanguage === lang.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-primary-foreground/60 hover:text-primary-foreground/80'
            )}
          >
            {lang.code}
          </button>
        ))}
      </div>
    </div>
  );
}
