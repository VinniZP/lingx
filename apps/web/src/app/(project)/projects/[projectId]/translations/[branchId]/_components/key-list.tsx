'use client';

import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import type { UnifiedSuggestion } from '@/hooks/use-suggestions';
import { TranslationKeyCard } from '@/components/translations';
import { LoadingState, EmptyKeysState, NoResultsState } from './empty-states';

interface KeyListProps {
  isLoading: boolean;
  keys: TranslationKey[];
  branchId: string;
  hasSearch: boolean;
  languages: ProjectLanguage[];
  defaultLanguage: ProjectLanguage | undefined;
  expandedKeyId: string | null;
  onExpandKey: (keyId: string | null) => void;
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  onTranslationChange: (keyId: string, lang: string, value: string) => void;
  savingKeys: Map<string, Set<string>>;
  savedKeys: Map<string, Set<string>>;
  canApprove: boolean;
  onApprove: (translationId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  approvingTranslations: Set<string>;
  selectedKeys: Set<string>;
  onSelectionChange: (keyId: string, selected: boolean) => void;
  getSuggestions: (keyId: string) => Map<string, UnifiedSuggestion[]>;
  onApplySuggestion: (keyId: string, lang: string, text: string, id: string) => void;
  onFetchMT: (keyId: string, lang: string) => void;
  getFetchingMTSet: (keyId: string) => Set<string>;
  focusedLanguage: string | null;
  onFocusLanguage: (lang: string | null) => void;
  isKeyIdFocused: (keyId: string) => boolean;
  onKeyboardNavigate: (direction: 'up' | 'down' | 'next' | 'prev') => void;
  onCreateKey: () => void;
  onSearchKey: (keyName: string) => void;
}

export function KeyList({
  isLoading,
  keys,
  branchId,
  hasSearch,
  languages,
  defaultLanguage,
  expandedKeyId,
  onExpandKey,
  getTranslationValue,
  onTranslationChange,
  savingKeys,
  savedKeys,
  canApprove,
  onApprove,
  approvingTranslations,
  selectedKeys,
  onSelectionChange,
  getSuggestions,
  onApplySuggestion,
  onFetchMT,
  getFetchingMTSet,
  focusedLanguage,
  onFocusLanguage,
  isKeyIdFocused,
  onKeyboardNavigate,
  onCreateKey,
  onSearchKey,
}: KeyListProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (keys.length === 0 && !hasSearch) {
    return <EmptyKeysState onCreateKey={onCreateKey} />;
  }

  if (keys.length === 0) {
    return <NoResultsState />;
  }

  return (
    <div className="divide-y divide-border/40">
      {keys.map((key) => (
        <TranslationKeyCard
          key={key.id}
          translationKey={key}
          branchId={branchId}
          languages={languages}
          defaultLanguage={defaultLanguage}
          isExpanded={expandedKeyId === key.id}
          onExpand={onExpandKey}
          getTranslationValue={(k, lang) => getTranslationValue(k, lang)}
          onTranslationChange={onTranslationChange}
          savingLanguages={savingKeys.get(key.id) || new Set()}
          savedLanguages={savedKeys.get(key.id) || new Set()}
          canApprove={canApprove}
          onApprove={onApprove}
          approvingTranslations={approvingTranslations}
          selectable={canApprove}
          selected={selectedKeys.has(key.id)}
          onSelectionChange={onSelectionChange}
          suggestions={getSuggestions(key.id)}
          onApplySuggestion={(lang, text, id) => onApplySuggestion(key.id, lang, text, id)}
          onFetchMT={(lang) => onFetchMT(key.id, lang)}
          isFetchingMT={getFetchingMTSet(key.id)}
          focusedLanguage={expandedKeyId === key.id ? focusedLanguage : null}
          onFocusLanguage={onFocusLanguage}
          isFocusedKey={isKeyIdFocused(key.id)}
          onKeyboardNavigate={onKeyboardNavigate}
          onSearchKey={onSearchKey}
        />
      ))}
    </div>
  );
}
