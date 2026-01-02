'use client';

import { use, useState, useCallback } from 'react';
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import type { TranslationKey } from '@/lib/api';
import { KeyFormDialog } from '@/components/key-form-dialog';
import { TranslationCommandPalette } from '@/components/translations';
import { BulkTranslateProgress } from '@/components/bulk-translate-progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeySuggestions, useKeyboardNavigation, useRecordTMUsage } from '@/hooks';
import { useBulkTranslateJob } from '@/hooks/use-bulk-translate-job';
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

  // URL-synced state (nuqs)
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [filter, setFilter] = useQueryState('filter', parseAsString.withDefault('all'));
  const [namespace, setNamespace] = useQueryState('ns', parseAsString.withDefault(''));

  // UI state
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<TranslationKey | undefined>();
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [bulkTranslateDialogOpen, setBulkTranslateDialogOpen] = useState(false);
  const [bulkTranslateProvider, setBulkTranslateProvider] = useState<'MT' | 'AI' | null>(null);

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
    namespaces,
    isLoading,
  } = useTranslationsPageData({ projectId, branchId, search, page, filter: filter as FilterType, namespace });

  // Mutations hook
  const {
    savingKeys,
    savedKeys,
    approvingTranslations,
    isBatchApproving,
    isBulkDeleting,
    getTranslationValue,
    handleTranslationChange,
    handleApprove,
    handleBatchApprove,
    handleBulkDelete,
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

  // Bulk translate job hook
  const bulkTranslateJob = useBulkTranslateJob({
    branchId,
    onComplete: () => {
      clearSelection();
      setBulkTranslateDialogOpen(false);
      setBulkTranslateProvider(null);
    },
    onError: () => {
      // Keep dialog open to show error
    },
  });

  // TM and suggestions
  const recordTMUsage = useRecordTMUsage(projectId);
  const {
    getSuggestions,
    setSuggestion,
    fetchMT,
    fetchAI,
    getFetchingMTSet,
    getFetchingAISet,
    hasMT,
    hasAI,
  } = useKeySuggestions(projectId, branchId);

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

  const handleFetchAI = useCallback(
    (keyId: string, lang: string) => {
      const key = keys.find((k) => k.id === keyId);
      if (!key || !defaultLanguage) return;
      const source = getTranslationValue(key, defaultLanguage.code);
      if (!source) return;
      fetchAI(keyId, source, defaultLanguage.code, lang);
    },
    [keys, defaultLanguage, getTranslationValue, fetchAI]
  );

  const onBatchApprove = useCallback(
    async (status: 'APPROVED' | 'REJECTED') => {
      await handleBatchApprove(status, selectedKeys, keys, clearSelection);
    },
    [handleBatchApprove, selectedKeys, keys, clearSelection]
  );

  const onBulkDelete = useCallback(
    async () => {
      await handleBulkDelete(selectedKeys, clearSelection);
    },
    [handleBulkDelete, selectedKeys, clearSelection]
  );

  const onBulkTranslate = useCallback(
    (provider: 'MT' | 'AI') => {
      setBulkTranslateProvider(provider);
      setBulkTranslateDialogOpen(true);
      bulkTranslateJob.start(Array.from(selectedKeys), provider);
    },
    [selectedKeys, bulkTranslateJob]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, [setSearch, setPage]);

  const handleFilterChange = useCallback((value: FilterType) => {
    setFilter(value);
    setPage(1);
  }, [setFilter, setPage]);

  const handleNamespaceChange = useCallback((value: string) => {
    setNamespace(value);
    setPage(1);
  }, [setNamespace, setPage]);

  const handleKeyDialogChange = useCallback((open: boolean) => {
    setShowKeyDialog(open);
    if (!open) setEditingKey(undefined);
  }, []);

  const handleSearchKey = useCallback((keyName: string) => {
    setSearch(keyName);
    setPage(1);
    setExpandedKeyId(null);
  }, [setSearch, setPage, setExpandedKeyId]);

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
          filter={filter as FilterType}
          onFilterChange={handleFilterChange}
          namespace={namespace}
          onNamespaceChange={handleNamespaceChange}
          namespaces={namespaces}
        />

        {selectedKeys.size > 0 && canApprove && (
          <BatchActionsBar
            selectedCount={selectedKeys.size}
            isApproving={isBatchApproving}
            isDeleting={isBulkDeleting}
            isTranslating={bulkTranslateJob.isRunning}
            onApprove={() => onBatchApprove('APPROVED')}
            onReject={() => onBatchApprove('REJECTED')}
            onDelete={onBulkDelete}
            onTranslateEmpty={onBulkTranslate}
            onClear={clearSelection}
            hasMT={hasMT}
            hasAI={hasAI}
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
          onFetchAI={handleFetchAI}
          getFetchingAISet={getFetchingAISet}
          hasAI={hasAI}
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
        onFetchAI={(lang) => {
          if (expandedKeyId) handleFetchAI(expandedKeyId, lang);
        }}
        onFetchAIAll={() => {
          if (expandedKeyId) {
            targetLanguages.forEach((lang) => handleFetchAI(expandedKeyId, lang));
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
        hasAI={hasAI}
      />

      {/* Bulk Translate Progress Dialog */}
      <BulkTranslateProgress
        open={bulkTranslateDialogOpen}
        onOpenChange={setBulkTranslateDialogOpen}
        provider={bulkTranslateProvider}
        progress={bulkTranslateJob.progress}
        isRunning={bulkTranslateJob.isRunning}
        isComplete={bulkTranslateJob.isComplete}
        result={bulkTranslateJob.result}
        error={bulkTranslateJob.error}
        onCancel={bulkTranslateJob.cancel}
      />
    </div>
  );
}
