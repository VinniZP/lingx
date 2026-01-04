'use client';

import type { Translation } from '@/lib/api';
import type { QualityIssue } from '@/lib/api/quality';
import { cn } from '@/lib/utils';
import type { UnifiedSuggestion } from '@/types';
import type { ProjectLanguage } from '@lingx/shared';
import { LanguageRowContent } from './LanguageRowContent';
import { LanguageRowHeader } from './LanguageRowHeader';

type FocusMode = 'keys' | 'source' | 'language' | 'suggestion';

interface LanguageRowProps {
  language: ProjectLanguage;
  translation?: Translation;
  value: string;
  sourceValue: string;
  onChange: (value: string) => void;
  isSaving: boolean;
  isSaved: boolean;
  validationError?: string;
  qualityIssues?: QualityIssue[];
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  suggestions: UnifiedSuggestion[];
  onApplySuggestion: (text: string, suggestionId: string) => void;
  onFetchMT: () => void;
  onFetchAI: () => void;
  isFetchingMT: boolean;
  isFetchingAI: boolean;
  hasMT: boolean;
  hasAI: boolean;
  // Keyboard navigation props
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  registerTextareaRef?: (ref: HTMLTextAreaElement | null) => void;
  isFocused?: boolean;
  isSuggestionFocused?: (index: number) => boolean;
  focusMode?: FocusMode;
  onFocus?: () => void;
}

export function LanguageRow({
  language,
  translation,
  value,
  sourceValue,
  onChange,
  isSaving,
  isSaved,
  validationError,
  qualityIssues,
  canApprove,
  onApprove,
  onReject,
  isApproving,
  suggestions,
  onApplySuggestion,
  onFetchMT,
  onFetchAI,
  isFetchingMT,
  isFetchingAI,
  hasMT,
  hasAI,
  // Keyboard navigation props
  isExpanded,
  onToggleExpand,
  registerTextareaRef,
  isFocused = false,
  isSuggestionFocused,
  focusMode,
  onFocus,
}: LanguageRowProps) {
  const getStatus = (): 'APPROVED' | 'REJECTED' | 'PENDING' | 'empty' => {
    if (!value) return 'empty';
    return translation?.status || 'PENDING';
  };

  const status = getStatus();
  const isEmpty = !value;

  // Source stats
  const sourceCharCount = sourceValue.length;
  const sourcePlaceholderCount = (sourceValue.match(/\{[^}]+\}/g) || []).length;

  return (
    <div
      aria-label={`${language.name} translation`}
      className={cn(
        'group border-l-3 transition-all',
        status === 'APPROVED' && 'border-l-success bg-success/5',
        status === 'REJECTED' && 'border-l-destructive bg-destructive/5',
        status === 'PENDING' && 'border-l-warning',
        status === 'empty' && 'border-l-muted-foreground/30 border-dashed',
        isFocused && 'ring-primary ring-2 ring-inset'
      )}
    >
      <LanguageRowHeader
        language={language}
        isExpanded={isExpanded}
        onToggle={() => onToggleExpand(!isExpanded)}
        value={value}
        status={status}
        qualityScore={translation?.qualityScore ?? null}
        isSaving={isSaving}
        isSaved={isSaved}
        canApprove={canApprove}
        isApproving={isApproving}
        onApprove={onApprove}
        onReject={onReject}
        onFetchMT={onFetchMT}
        onFetchAI={onFetchAI}
        isFetchingMT={isFetchingMT}
        isFetchingAI={isFetchingAI}
        hasMT={hasMT}
        hasAI={hasAI}
      />

      {/* Expandable content */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <LanguageRowContent
            value={value}
            onChange={onChange}
            sourceCharCount={sourceCharCount}
            sourcePlaceholderCount={sourcePlaceholderCount}
            validationError={validationError}
            qualityIssues={qualityIssues}
            suggestions={suggestions}
            onApplySuggestion={onApplySuggestion}
            isEmpty={isEmpty}
            onFetchMT={onFetchMT}
            onFetchAI={onFetchAI}
            isFetchingMT={isFetchingMT}
            isFetchingAI={isFetchingAI}
            hasMT={hasMT}
            hasAI={hasAI}
            // Keyboard navigation props
            registerTextareaRef={registerTextareaRef}
            languageName={language.name}
            isLanguageFocused={isFocused}
            isSuggestionFocused={isSuggestionFocused}
            focusMode={focusMode}
            onFocus={onFocus}
          />
        </div>
      </div>
    </div>
  );
}
