'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProjectLanguage } from '@lingx/shared';
import { TranslationKey } from '@/lib/api';
import { evaluateTranslationQuality } from '@/lib/api/quality';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Edit, Save, Loader2 } from 'lucide-react';
import { TranslationMemoryPanel } from './translation-memory-panel';
import { QualityScoreBadge, QualityScoreBadgeSkeleton } from './quality-score-badge';
import { useTranslation } from '@lingx/sdk-nextjs';

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
  projectId: string;
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
  projectId,
  getTranslationValue,
  onTranslationChange,
  onSave,
  onEditKey,
  hasUnsavedChanges,
  isSaving,
}: TranslationEditorProps) {
  const { t } = useTranslation();
  const [focusedLanguage, setFocusedLanguage] = useState<string | null>(null);

  // Get default language for TM source
  const defaultLanguage = languages.find((l) => l.isDefault);

  // Handle applying TM match to focused language
  const handleApplyTMMatch = (targetText: string) => {
    if (translationKey && focusedLanguage) {
      onTranslationChange(translationKey.id, focusedLanguage, targetText);
    }
  };

  if (!translationKey) {
    return (
      <div className="island p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Edit className="size-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {t('translations.editor.selectKeyPrompt')}
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
              {isSaving ? t('translations.editor.saving') : t('translations.editor.saveChanges')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t('translations.editor.unsavedChanges')}
            </span>
          </div>
        )}
      </div>

      {/* Languages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {languages.map((lang) => {
          const flag = LANGUAGE_FLAGS[lang.code] || '🌐';
          const value = getTranslationValue(translationKey, lang.code);

          // Find the translation ID for this language
          const translation = translationKey.translations.find((t) => t.language === lang.code);
          const translationId = translation?.id;

          return (
            <div key={lang.code} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <span className="font-medium text-sm">{lang.name}</span>
                {lang.isDefault && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20">
                    {t('translations.editor.default')}
                  </span>
                )}

                {/* Quality Score Badge */}
                {translationId && value && <TranslationQualityBadge translationId={translationId} />}
              </div>
              <Textarea
                value={value}
                onChange={(e) =>
                  onTranslationChange(translationKey.id, lang.code, e.target.value)
                }
                onFocus={() => setFocusedLanguage(lang.code)}
                placeholder={t('translations.editor.enterTranslationPlaceholder', { language: lang.name })}
                className={cn(
                  'min-h-[80px] resize-none',
                  !value && 'border-warning/30 bg-warning/5'
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Translation Memory Panel */}
      {defaultLanguage && focusedLanguage && focusedLanguage !== defaultLanguage.code && (
        <TranslationMemoryPanel
          projectId={projectId}
          sourceText={getTranslationValue(translationKey, defaultLanguage.code)}
          sourceLanguage={defaultLanguage.code}
          targetLanguage={focusedLanguage}
          onApplyMatch={handleApplyTMMatch}
          isVisible={true}
        />
      )}
    </div>
  );
}

/**
 * Translation Quality Badge with data fetching
 *
 * Fetches and displays quality score for a translation
 */
function TranslationQualityBadge({ translationId }: { translationId: string }) {
  const { data: score, isLoading } = useQuery({
    queryKey: ['quality-score', translationId],
    queryFn: () => evaluateTranslationQuality(translationId),
    // Don't auto-fetch - only fetch on demand or manual trigger
    enabled: false,
    // Cache quality scores for 10 minutes
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return <QualityScoreBadgeSkeleton size="sm" />;
  }

  if (!score) {
    return null;
  }

  return <QualityScoreBadge score={score} size="sm" showDimensions />;
}
