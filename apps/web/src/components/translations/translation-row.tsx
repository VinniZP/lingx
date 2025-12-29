'use client';

import { useState, useEffect, useRef } from 'react';
import { TranslationKey, ProjectLanguage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

type TranslationStatus = 'translated' | 'modified' | 'missing';

interface LanguageTranslation {
  language: ProjectLanguage;
  value: string;
  status: TranslationStatus;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}

interface TranslationRowProps {
  translationKey: TranslationKey;
  languages: ProjectLanguage[];
  visibleLanguages: Set<string>;
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  onTranslationChange: (keyId: string, lang: string, value: string) => void;
  onSave: (keyId: string) => Promise<void>;
  hasUnsavedChanges: (keyId: string, lang: string) => boolean;
  savingLanguages: Set<string>;
  savedLanguages: Set<string>;
}

export function TranslationRow({
  translationKey,
  languages,
  visibleLanguages,
  getTranslationValue,
  onTranslationChange,
  onSave,
  hasUnsavedChanges,
  savingLanguages,
  savedLanguages,
}: TranslationRowProps) {
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Get visible languages in order
  const visibleLangs = languages.filter((l) => visibleLanguages.has(l.code));
  const defaultLang = languages.find((l) => l.isDefault);

  // Auto-resize textareas
  useEffect(() => {
    Object.values(textareaRefs.current).forEach((textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    });
  }, [editingLang, visibleLanguages]);

  // Get original saved value from translation key
  const getOriginalValue = (lang: string): string => {
    return translationKey.translations.find((t) => t.language === lang)?.value || '';
  };

  const getStatus = (lang: string): TranslationStatus => {
    const currentValue = getTranslationValue(translationKey, lang);
    const originalValue = getOriginalValue(lang);

    if (!currentValue) return 'missing';
    // Compare current with original to detect modifications
    if (currentValue !== originalValue) return 'modified';
    return 'translated';
  };

  const handleClick = (langCode: string) => {
    setEditingLang(langCode);
    setTimeout(() => textareaRefs.current[langCode]?.focus(), 0);
  };

  const handleBlur = (langCode: string) => {
    const currentValue = getTranslationValue(translationKey, langCode);
    const originalValue = getOriginalValue(langCode);
    // Only close if no unsaved changes
    if (currentValue === originalValue) {
      setEditingLang(null);
    }
  };

  return (
    <div className="group relative px-5 py-4 border-b border-border/40 transition-colors hover:bg-muted/20">
      {/* Key name */}
      <div className="font-mono text-xs text-muted-foreground mb-3 tracking-wide">
        {translationKey.name}
      </div>

      {/* Language translations */}
      <div className="space-y-2">
        {visibleLangs.map((lang) => {
          const value = getTranslationValue(translationKey, lang.code);
          const status = getStatus(lang.code);
          const isEditing = editingLang === lang.code;
          const isSaving = savingLanguages.has(lang.code);
          const justSaved = savedLanguages.has(lang.code);

          return (
            <div key={lang.code} className="flex items-start gap-3">
              {/* Status dot */}
              <div
                className={cn(
                  'size-2 rounded-full mt-2 shrink-0 transition-colors',
                  status === 'translated' && 'bg-emerald-500',
                  status === 'modified' && 'bg-amber-500',
                  status === 'missing' && 'bg-red-500'
                )}
              />

              {/* Language label */}
              <div className="w-8 shrink-0">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    lang.isDefault ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {lang.code}
                </span>
              </div>

              {/* Value */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <textarea
                    ref={(el) => { textareaRefs.current[lang.code] = el; }}
                    value={value}
                    onChange={(e) =>
                      onTranslationChange(translationKey.id, lang.code, e.target.value)
                    }
                    onBlur={() => handleBlur(lang.code)}
                    placeholder={`Enter ${lang.name} translation...`}
                    className={cn(
                      'w-full bg-transparent text-[15px] leading-relaxed resize-none',
                      'focus:outline-none placeholder:text-muted-foreground/40',
                      'min-h-[24px]'
                    )}
                    rows={1}
                  />
                ) : (
                  <button
                    onClick={() => handleClick(lang.code)}
                    className={cn(
                      'w-full text-left text-[15px] leading-relaxed',
                      !value && 'italic text-muted-foreground/60'
                    )}
                  >
                    {value || 'Missing translation'}
                  </button>
                )}
              </div>

              {/* Save status */}
              <div className="w-20 shrink-0 flex items-center justify-end">
                {isSaving && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Saving</span>
                  </div>
                )}
                {justSaved && !isSaving && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 animate-fade-in">
                    <Check className="size-3" />
                    <span>Saved</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
