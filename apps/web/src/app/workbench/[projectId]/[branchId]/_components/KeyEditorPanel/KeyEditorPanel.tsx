'use client';

import type { TranslationKey } from '@/lib/api';
import type { UnifiedSuggestion } from '@/types';
import type { ProjectLanguage } from '@lingx/shared';
import type { RefObject } from 'react';
import { useMemo } from 'react';
import { useKeyQualityEvaluation, useKeyQualityIssues } from '../../_hooks';
import { BottomDock } from '../BottomDock';
import { LanguageRow } from '../LanguageRow';
import { KeyHeader } from './KeyHeader';
import { SourceSection } from './SourceSection';

type FocusMode = 'keys' | 'source' | 'language' | 'suggestion';

interface KeyEditorPanelProps {
  keyData?: TranslationKey;
  languages: ProjectLanguage[];
  defaultLanguage?: ProjectLanguage;
  targetLanguages: string[];
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  onTranslationChange: (keyId: string, lang: string, value: string) => void;
  savingKeys: Map<string, Set<string>>;
  savedKeys: Map<string, Set<string>>;
  validationErrors: Map<string, string>;
  canApprove: boolean;
  onApprove: (translationId: string, status: 'APPROVED' | 'REJECTED') => void;
  approvingTranslations: Set<string>;
  getSuggestions: (keyId: string) => Map<string, UnifiedSuggestion[]>;
  onApplySuggestion: (keyId: string, lang: string, text: string, suggestionId: string) => void;
  onFetchMT: (keyId: string, lang: string) => void;
  onFetchAI: (keyId: string, lang: string) => void;
  getFetchingMTSet: (keyId: string) => Set<string>;
  getFetchingAISet: (keyId: string) => Set<string>;
  hasMT: boolean;
  hasAI: boolean;
  projectId: string;
  branchId: string;
  // Keyboard navigation props
  expandedLanguages: Set<string>;
  onExpandLanguage: (lang: string, expanded: boolean) => void;
  sourceTextareaRef: RefObject<HTMLTextAreaElement | null>;
  registerLanguageTextarea: (lang: string, ref: HTMLTextAreaElement | null) => void;
  isLanguageFocused: (lang: string) => boolean;
  isSuggestionFocused: (index: number) => boolean;
  focusMode: FocusMode;
  onSourceFocus: () => void;
  onLanguageFocus: (lang: string) => void;
}

export function KeyEditorPanel({
  keyData,
  languages,
  defaultLanguage,
  targetLanguages,
  getTranslationValue,
  onTranslationChange,
  savingKeys,
  savedKeys,
  validationErrors,
  canApprove,
  onApprove,
  approvingTranslations,
  getSuggestions,
  onApplySuggestion,
  onFetchMT,
  onFetchAI,
  getFetchingMTSet,
  getFetchingAISet,
  hasMT,
  hasAI,
  projectId,
  branchId,
  // Keyboard navigation props
  expandedLanguages,
  onExpandLanguage,
  sourceTextareaRef,
  registerLanguageTextarea,
  isLanguageFocused,
  isSuggestionFocused,
  focusMode,
  onSourceFocus,
  onLanguageFocus,
}: KeyEditorPanelProps) {
  // Quality evaluation hook
  const { evaluateKeyQuality, isEvaluating } = useKeyQualityEvaluation({
    branchId,
  });

  // Fetch quality issues for the selected key
  const { data: qualityIssuesData } = useKeyQualityIssues(keyData?.id ?? null);

  // Get target language objects
  const targetLanguageObjects = useMemo(() => {
    return languages.filter((l) => !l.isDefault);
  }, [languages]);

  // Source value
  const sourceValue =
    keyData && defaultLanguage ? getTranslationValue(keyData, defaultLanguage.code) : '';

  if (!keyData) {
    return (
      <div className="bg-muted/30 flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Select a key to edit</p>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-1 flex-col overflow-hidden">
      {/* Key Header */}
      <KeyHeader
        keyData={keyData}
        onEvaluateQuality={() => evaluateKeyQuality(keyData)}
        isEvaluatingQuality={isEvaluating}
      />

      {/* Source Section - editable */}
      {defaultLanguage && (
        <SourceSection
          language={defaultLanguage}
          value={sourceValue}
          onChange={(newValue) => onTranslationChange(keyData.id, defaultLanguage.code, newValue)}
          isSaving={savingKeys.get(keyData.id)?.has(defaultLanguage.code) ?? false}
          isSaved={savedKeys.get(keyData.id)?.has(defaultLanguage.code) ?? false}
          textareaRef={sourceTextareaRef}
          isFocused={focusMode === 'source'}
          onFocus={onSourceFocus}
        />
      )}

      {/* Language Rows (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-border/50 divide-y">
          {targetLanguageObjects.map((lang) => {
            const translation = keyData.translations.find((t) => t.language === lang.code);
            const value = getTranslationValue(keyData, lang.code);
            const isSaving = savingKeys.get(keyData.id)?.has(lang.code) ?? false;
            const isSaved = savedKeys.get(keyData.id)?.has(lang.code) ?? false;
            const validationError = validationErrors.get(`${keyData.id}-${lang.code}`);
            const isFetchingMT = getFetchingMTSet(keyData.id).has(lang.code);
            const isFetchingAI = getFetchingAISet(keyData.id).has(lang.code);
            const qualityIssues = qualityIssuesData?.issues?.[lang.code] ?? [];

            const suggestions = getSuggestions(keyData.id).get(lang.code) || [];

            return (
              <LanguageRow
                key={lang.code}
                language={lang}
                translation={translation}
                value={value}
                sourceValue={sourceValue}
                onChange={(newValue) => onTranslationChange(keyData.id, lang.code, newValue)}
                isSaving={isSaving}
                isSaved={isSaved}
                validationError={validationError}
                qualityIssues={qualityIssues}
                canApprove={canApprove}
                onApprove={() => translation && onApprove(translation.id, 'APPROVED')}
                onReject={() => translation && onApprove(translation.id, 'REJECTED')}
                isApproving={translation ? approvingTranslations.has(translation.id) : false}
                suggestions={suggestions}
                onApplySuggestion={(text, suggestionId) =>
                  onApplySuggestion(keyData.id, lang.code, text, suggestionId)
                }
                onFetchMT={() => onFetchMT(keyData.id, lang.code)}
                onFetchAI={() => onFetchAI(keyData.id, lang.code)}
                isFetchingMT={isFetchingMT}
                isFetchingAI={isFetchingAI}
                hasMT={hasMT}
                hasAI={hasAI}
                // Keyboard navigation props
                isExpanded={expandedLanguages.has(lang.code)}
                onToggleExpand={(expanded) => onExpandLanguage(lang.code, expanded)}
                registerTextareaRef={(ref) => registerLanguageTextarea(lang.code, ref)}
                isFocused={isLanguageFocused(lang.code)}
                isSuggestionFocused={isSuggestionFocused}
                focusMode={focusMode}
                onFocus={() => onLanguageFocus(lang.code)}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Dock */}
      <BottomDock
        keyData={keyData}
        projectId={projectId}
        branchId={branchId}
        sourceLanguage={defaultLanguage?.code}
        sourceText={sourceValue}
        targetLanguages={targetLanguages}
        getSuggestions={getSuggestions}
        getFetchingMTSet={getFetchingMTSet}
        getFetchingAISet={getFetchingAISet}
        onApplyGlossaryMatch={(targetLang, text) =>
          onTranslationChange(keyData.id, targetLang, text)
        }
      />
    </div>
  );
}
