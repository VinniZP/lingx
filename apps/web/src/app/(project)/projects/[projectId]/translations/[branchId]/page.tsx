'use client';

import { use, useState, useCallback } from 'react';
import type { TranslationKey } from '@/lib/api';
import { KeyFormDialog } from '@/components/key-form-dialog';
import { TranslationCommandPalette } from '@/components/translations';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeySuggestions, useKeyboardNavigation, useRecordTMUsage } from '@/hooks';
import {
  PaginationBar,
  BatchActionsBar,
  SearchFilterBar,
  TranslationsHeader,
  MobileTranslationsView,
  MergeBranchButton,
  BranchStatsBar,
  KeyList,
  type FilterType,
} from './_components';
import {
  useTranslationMutations,
  useTranslationsPageData,
  useTMSuggestions,
  useKeySelection,
} from './_hooks';

interface PageProps {
  params: Promise<{ projectId: string; branchId: string }>;
}

export default function TranslationsPage({ params }: PageProps) {
  const { projectId, branchId } = use(params);
  const isMobile = useIsMobile();

  // UI state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<TranslationKey | undefined>();
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Data hook
  const {
    branch,
    languages,
    keys,
    total,
    totalPages,
    defaultLanguage,
    targetLanguages,
    canApprove,
    currentBranchInfo,
    completionStats,
    isLoading,
  } = useTranslationsPageData({ projectId, branchId, search, page, filter });

  // Mutations hook
  const {
    savingKeys,
    savedKeys,
    approvingTranslations,
    isBatchApproving,
    getTranslationValue,
    handleTranslationChange,
    handleApprove,
    handleBatchApprove,
    batchApproveTranslations,
    setTranslationValue,
  } = useTranslationMutations({ branchId });

  // Selection hook
  const {
    selectedKeys,
    handleSelectionChange,
    handleSelectAll,
    clearSelection,
    isAllSelected,
  } = useKeySelection({ keys });

  // TM and suggestions
  const recordTMUsage = useRecordTMUsage(projectId);
  const { getSuggestions, setSuggestion, fetchMT, getFetchingMTSet, hasMT } = useKeySuggestions(projectId, branchId);

  // TM suggestions for expanded key
  const expandedKey = expandedKeyId ? keys.find((k) => k.id === expandedKeyId) : null;
  const sourceText = expandedKey && defaultLanguage
    ? getTranslationValue(expandedKey, defaultLanguage.code)
    : '';

  useTMSuggestions({
    projectId,
    expandedKeyId,
    sourceText,
    sourceLanguage: defaultLanguage?.code,
    targetLanguages,
    setSuggestion,
  });

  // Keyboard navigation
  const {
    focusedLanguage,
    focusLanguage,
    handleKeyboardNavigate,
    isKeyIdFocused,
  } = useKeyboardNavigation({
    keyCount: keys.length,
    languageCount: languages.length,
    expandedKeyId,
    onExpandKey: setExpandedKeyId,
    getKeyIdByIndex: useCallback((index: number) => keys[index]?.id, [keys]),
    onOpenCommandPalette: useCallback(() => setCommandPaletteOpen(true), []),
    enabled: !isMobile,
  });

  // Handlers
  const handleApplySuggestion = useCallback(
    (keyId: string, lang: string, text: string, suggestionId: string) => {
      handleTranslationChange(keyId, lang, text);
      if (!suggestionId.startsWith('tm-') && !suggestionId.startsWith('mt-')) {
        recordTMUsage.mutate(suggestionId);
      }
    },
    [handleTranslationChange, recordTMUsage]
  );

  const handleFetchMT = useCallback(
    (keyId: string, lang: string) => {
      const key = keys.find((k) => k.id === keyId);
      if (!key || !defaultLanguage) return;
      const source = getTranslationValue(key, defaultLanguage.code);
      if (!source) return;
      fetchMT(keyId, source, defaultLanguage.code, lang);
    },
    [keys, defaultLanguage, getTranslationValue, fetchMT]
  );

  const onBatchApprove = useCallback(
    async (status: 'APPROVED' | 'REJECTED') => {
      await handleBatchApprove(status, selectedKeys, keys, clearSelection);
    },
    [handleBatchApprove, selectedKeys, keys, clearSelection]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((value: FilterType) => {
    setFilter(value);
    setPage(1);
  }, []);

  const handleKeyDialogChange = useCallback((open: boolean) => {
    setShowKeyDialog(open);
    if (!open) setEditingKey(undefined);
  }, []);

  const handleSearchKey = useCallback((keyName: string) => {
    setSearch(keyName);
    setPage(1);
    setExpandedKeyId(null);
  }, []);

  // Mobile layout
  if (isMobile) {
    return (
      <MobileTranslationsView
        projectId={projectId}
        branchId={branchId}
        spaceName={branch?.space.name}
        branchName={branch?.name}
        search={search}
        onSearchChange={handleSearchChange}
        isLoading={isLoading}
        keys={keys}
        languages={languages}
        defaultLanguage={defaultLanguage}
        expandedKeyId={expandedKeyId}
        onExpandKey={setExpandedKeyId}
        getTranslationValue={getTranslationValue}
        onTranslationChange={handleTranslationChange}
        savingKeys={savingKeys}
        savedKeys={savedKeys}
        canApprove={canApprove}
        onApprove={handleApprove}
        approvingTranslations={approvingTranslations}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        getSuggestions={getSuggestions}
        onApplySuggestion={handleApplySuggestion}
        onFetchMT={handleFetchMT}
        getFetchingMTSet={getFetchingMTSet}
        focusedLanguage={focusedLanguage}
        onFocusLanguage={focusLanguage}
        isKeyIdFocused={isKeyIdFocused}
        onKeyboardNavigate={handleKeyboardNavigate}
        showKeyDialog={showKeyDialog}
        onShowKeyDialogChange={handleKeyDialogChange}
        editingKey={editingKey}
        onSearchKey={handleSearchKey}
      />
    );
  }

  // Desktop Layout
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <TranslationsHeader
        projectId={projectId}
        spaceName={branch?.space.name}
        branchName={branch?.name}
        onCreateKey={() => setShowKeyDialog(true)}
        mergeButton={
          <MergeBranchButton
            projectId={projectId}
            spaceId={branch?.space.id}
            currentBranch={currentBranchInfo}
          />
        }
      />

      {/* Main Card */}
      <div className="island overflow-hidden animate-fade-in-up stagger-1">
        <BranchStatsBar
          branchName={branch?.name || 'main'}
          completionPercent={completionStats.percent}
          totalKeys={total}
          languageCount={languages.length}
        />

        <SearchFilterBar
          canApprove={canApprove}
          hasKeys={keys.length > 0}
          allSelected={isAllSelected}
          onSelectAll={handleSelectAll}
          search={search}
          onSearchChange={handleSearchChange}
          filter={filter}
          onFilterChange={handleFilterChange}
        />

        {selectedKeys.size > 0 && canApprove && (
          <BatchActionsBar
            selectedCount={selectedKeys.size}
            isApproving={isBatchApproving}
            onApprove={() => onBatchApprove('APPROVED')}
            onReject={() => onBatchApprove('REJECTED')}
            onClear={clearSelection}
          />
        )}

        <KeyList
          isLoading={isLoading}
          keys={keys}
          branchId={branchId}
          hasSearch={!!search}
          languages={languages}
          defaultLanguage={defaultLanguage}
          expandedKeyId={expandedKeyId}
          onExpandKey={setExpandedKeyId}
          getTranslationValue={getTranslationValue}
          onTranslationChange={handleTranslationChange}
          savingKeys={savingKeys}
          savedKeys={savedKeys}
          canApprove={canApprove}
          onApprove={handleApprove}
          approvingTranslations={approvingTranslations}
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange}
          getSuggestions={getSuggestions}
          onApplySuggestion={handleApplySuggestion}
          onFetchMT={handleFetchMT}
          getFetchingMTSet={getFetchingMTSet}
          focusedLanguage={focusedLanguage}
          onFocusLanguage={focusLanguage}
          isKeyIdFocused={isKeyIdFocused}
          onKeyboardNavigate={handleKeyboardNavigate}
          onCreateKey={() => setShowKeyDialog(true)}
          onSearchKey={handleSearchKey}
        />

        {totalPages > 1 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Dialogs */}
      <KeyFormDialog
        open={showKeyDialog}
        onOpenChange={handleKeyDialogChange}
        branchId={branchId}
        editKey={editingKey}
      />

      {/* Command Palette */}
      <TranslationCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        keys={keys}
        expandedKeyId={expandedKeyId}
        focusedLanguage={focusedLanguage}
        sourceLanguage={defaultLanguage?.code ?? null}
        onSelectKey={(keyId) => {
          setExpandedKeyId(keyId);
          focusLanguage(null);
        }}
        onFetchMT={(lang) => {
          if (expandedKeyId) handleFetchMT(expandedKeyId, lang);
        }}
        onFetchMTAll={() => {
          if (expandedKeyId) {
            targetLanguages.forEach((lang) => handleFetchMT(expandedKeyId, lang));
          }
        }}
        onCopyFromSource={(lang) => {
          if (expandedKeyId && defaultLanguage) {
            const key = keys.find((k) => k.id === expandedKeyId);
            if (key) {
              const text = getTranslationValue(key, defaultLanguage.code);
              if (text) setTranslationValue(expandedKeyId, lang, text);
            }
          }
        }}
        onApprove={(translationId) => handleApprove(translationId, 'APPROVED')}
        onReject={(translationId) => handleApprove(translationId, 'REJECTED')}
        onApproveKey={(translationIds) => batchApproveTranslations(translationIds, 'APPROVED')}
        onRejectKey={(translationIds) => batchApproveTranslations(translationIds, 'REJECTED')}
        hasMT={hasMT}
      />
    </div>
  );
}
