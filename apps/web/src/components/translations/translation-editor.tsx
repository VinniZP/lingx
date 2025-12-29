'use client';

import { TranslationKey, ProjectLanguage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Edit, Save, Loader2, GitBranch, Clock, Sparkles } from 'lucide-react';

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

interface TranslationEditorProps {
  translationKey: TranslationKey | null;
  languages: ProjectLanguage[];
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  onTranslationChange: (keyId: string, lang: string, value: string) => void;
  onSave: (keyId: string) => void;
  onEditKey: (key: TranslationKey) => void;
  hasUnsavedChanges: (keyId: string) => boolean;
  isSaving: boolean;
}

export function TranslationEditor({
  translationKey,
  languages,
  getTranslationValue,
  onTranslationChange,
  onSave,
  onEditKey,
  hasUnsavedChanges,
  isSaving,
}: TranslationEditorProps) {
  if (!translationKey) {
    return (
      <div className="island p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Edit className="size-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Select a key from the list to edit translations
          </p>
        </div>
      </div>
    );
  }

  const unsaved = hasUnsavedChanges(translationKey.id);

  return (
    <div className="island p-0 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm font-semibold truncate">
              {translationKey.name}
            </div>
            {translationKey.description && (
              <div className="text-xs text-muted-foreground mt-1">
                {translationKey.description}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditKey(translationKey)}
            className="shrink-0"
          >
            <Edit className="size-4" />
          </Button>
        </div>

        {/* Save button */}
        {unsaved && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onSave(translationKey.id)}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          </div>
        )}
      </div>

      {/* Languages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {languages.map((lang) => {
          const flag = LANGUAGE_FLAGS[lang.code] || '🌐';
          const value = getTranslationValue(translationKey, lang.code);

          return (
            <div key={lang.code} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <span className="font-medium text-sm">{lang.name}</span>
                {lang.isDefault && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20">
                    default
                  </span>
                )}
              </div>
              <Textarea
                value={value}
                onChange={(e) =>
                  onTranslationChange(translationKey.id, lang.code, e.target.value)
                }
                placeholder={`Enter ${lang.name} translation...`}
                className={cn(
                  'min-h-[80px] resize-none',
                  !value && 'border-warning/30 bg-warning/5'
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Translation Sources Placeholder */}
      <div className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">From Other Branches</span>
        </div>
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Cross-branch translation references
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
