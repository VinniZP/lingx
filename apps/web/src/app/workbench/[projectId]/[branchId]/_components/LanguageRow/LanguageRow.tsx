'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectLanguage } from '@lingx/shared';
import type { TranslationKey, Translation } from '@/lib/api';
import type { QualityIssue } from '@/lib/api/quality';
import { LanguageRowHeader } from './LanguageRowHeader';
import { LanguageRowContent } from './LanguageRowContent';

interface UnifiedSuggestion {
  id: string;
  type: 'tm' | 'mt' | 'ai';
  text: string;
  confidence: number;
  source?: string;
  provider?: string;
}

interface LanguageRowProps {
  keyId: string;
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
}

export function LanguageRow({
  keyId,
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
}: LanguageRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Smart expand: auto-expand if empty, pending, or rejected
  useEffect(() => {
    const status = getStatus();
    if (status === 'empty' || status === 'PENDING' || status === 'REJECTED') {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [keyId, translation?.status, value]);

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
      className={cn(
        'group border-l-3 transition-all',
        status === 'APPROVED' && 'border-l-success bg-success/5',
        status === 'REJECTED' && 'border-l-destructive bg-destructive/5',
        status === 'PENDING' && 'border-l-warning',
        status === 'empty' && 'border-l-muted-foreground/30 border-dashed'
      )}
    >
      <LanguageRowHeader
        language={language}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
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
            sourceValue={sourceValue}
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
          />
        </div>
      </div>
    </div>
  );
}
