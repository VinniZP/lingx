'use client';

import { use, useState, useCallback, useMemo } from 'react';
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TranslationKey } from '@/lib/api';
import { useKeySuggestions, useRecordTMUsage } from '@/hooks';
import { useBulkTranslateJob } from '@/hooks/use-bulk-translate-job';
import { KeyFormDialog } from '@/components/key-form-dialog';
import { BulkTranslateProgress } from '@/components/bulk-translate-progress';
import { BulkQualityEvaluationDialog } from '@/components/translations/bulk-quality-evaluation-dialog';
import {
  useTranslationsPageData,
  useTranslationMutations,
  useKeySelection,
  useTMSuggestions,
  type FilterType,
  type QualityFilterType,
} from './_hooks';
import { WorkbenchToolbar } from './_components/WorkbenchToolbar';
import { KeyListSidebar } from './_components/KeyListSidebar';
import { KeyEditorPanel } from './_components/KeyEditorPanel';
import { FloatingBatchBar } from './_components/FloatingBatchBar';

interface PageProps {
  params: Promise<{ projectId: string; branchId: string }>;
}

export default function WorkbenchPage({ params }: PageProps) {
  const { projectId, branchId } = use(params);

  // URL-synced state
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [filter, setFilter] = useQueryState('filter', parseAsString.withDefault('all'));
  const [namespace, setNamespace] = useQueryState('ns', parseAsString.withDefault(''));

  // UI state
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityFilterType>('all');
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<TranslationKey | undefined>();
  const [bulkTranslateDialogOpen, setBulkTranslateDialogOpen] = useState(false);
  const [bulkTranslateProvider, setBulkTranslateProvider] = useState<'MT' | 'AI' | null>(null);
  const [bulkQualityDialogOpen, setBulkQualityDialogOpen] = useState(false);

  // Data hook
  const {
    project,
    branch,
    languages,
    keys,
    total,
    totalPages,
    defaultLanguage,
    targetLanguages,
    canApprove,
    completionStats,
    namespaces,
    isLoading,
  } = useTranslationsPageData({
    projectId,
    branchId,
    search,
    page,
    filter: filter as FilterType,
    qualityFilter,
    namespace,
  });

  // Mutations hook
  const {
    savingKeys,
    savedKeys,
    validationErrors,
    approvingTranslations,
    isBatchApproving,
    isBulkDeleting,
    getTranslationValue,
    handleTranslationChange,
    handleApprove,
    handleBatchApprove,
    handleBulkDelete,
  } = useTranslationMutations({ branchId });

  // Selection hook
  const {
    selectedKeys,
    handleSelectionChange,
    handleSelectAll,
    clearSelection,
    isAllSelected,
  } = useKeySelection({ keys });

  // Compute translation IDs from selected keys for quality evaluation
  const selectedTranslationIds = useMemo(() => {
    if (selectedKeys.size === 0) return undefined;
    return keys
      .filter(key => selectedKeys.has(key.id))
      .flatMap(key => key.translations.map(t => t.id));
  }, [selectedKeys, keys]);

  // Bulk translate job
  const bulkTranslateJob = useBulkTranslateJob({
    branchId,
    onComplete: () => {
      clearSelection();
      setBulkTranslateDialogOpen(false);
      setBulkTranslateProvider(null);
    },
    onError: () => {},
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

  // TM suggestions for selected key
  const selectedKey = selectedKeyId ? keys.find((k) => k.id === selectedKeyId) : null;
  const sourceText = selectedKey && defaultLanguage
    ? getTranslationValue(selectedKey, defaultLanguage.code)
    : '';

  useTMSuggestions({
    projectId,
    expandedKeyId: selectedKeyId,
    sourceText,
    sourceLanguage: defaultLanguage?.code,
    targetLanguages,
    setSuggestion,
  });

  // Handlers
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

  // Auto-select first key if none selected
  const effectiveSelectedKeyId = selectedKeyId ?? keys[0]?.id ?? null;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <WorkbenchToolbar
        projectId={projectId}
        branchName={branch?.name || 'main'}
        completionPercent={completionStats.percent}
        totalKeys={total}
        languageCount={languages.length}
        search={search}
        onSearchChange={handleSearchChange}
        filter={filter as FilterType}
        onFilterChange={handleFilterChange}
        qualityFilter={qualityFilter}
        onQualityFilterChange={setQualityFilter}
        namespace={namespace}
        onNamespaceChange={handleNamespaceChange}
        namespaces={namespaces}
        onCreateKey={() => setShowKeyDialog(true)}
        onEvaluateQuality={() => setBulkQualityDialogOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Key List Sidebar */}
        <KeyListSidebar
          keys={keys}
          selectedKeyId={effectiveSelectedKeyId}
          onSelectKey={setSelectedKeyId}
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          canApprove={canApprove}
          isLoading={isLoading}
          defaultLanguage={defaultLanguage}
          targetLanguages={targetLanguages.slice(0, 4)}
          getTranslationValue={getTranslationValue}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        {/* Editor Panel */}
        <KeyEditorPanel
          keyData={selectedKey ?? undefined}
          languages={languages}
          defaultLanguage={defaultLanguage}
          targetLanguages={targetLanguages}
          getTranslationValue={getTranslationValue}
          onTranslationChange={handleTranslationChange}
          savingKeys={savingKeys}
          savedKeys={savedKeys}
          validationErrors={validationErrors}
          canApprove={canApprove}
          onApprove={handleApprove}
          approvingTranslations={approvingTranslations}
          getSuggestions={getSuggestions}
          onApplySuggestion={handleApplySuggestion}
          onFetchMT={handleFetchMT}
          onFetchAI={handleFetchAI}
          getFetchingMTSet={getFetchingMTSet}
          getFetchingAISet={getFetchingAISet}
          hasMT={hasMT}
          hasAI={hasAI}
          projectId={projectId}
          branchId={branchId}
        />
      </div>

      {/* Floating Batch Action Bar */}
      {selectedKeys.size > 0 && canApprove && (
        <FloatingBatchBar
          selectedCount={selectedKeys.size}
          isApproving={isBatchApproving}
          isDeleting={isBulkDeleting}
          isTranslating={bulkTranslateJob.isRunning}
          onApprove={() => onBatchApprove('APPROVED')}
          onReject={() => onBatchApprove('REJECTED')}
          onDelete={onBulkDelete}
          onTranslate={onBulkTranslate}
          onEvaluateQuality={() => setBulkQualityDialogOpen(true)}
          onClear={clearSelection}
          hasMT={hasMT}
          hasAI={hasAI}
        />
      )}

      {/* Dialogs */}
      <KeyFormDialog
        open={showKeyDialog}
        onOpenChange={(open) => {
          setShowKeyDialog(open);
          if (!open) setEditingKey(undefined);
        }}
        branchId={branchId}
        editKey={editingKey}
      />

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

      <BulkQualityEvaluationDialog
        open={bulkQualityDialogOpen}
        onOpenChange={setBulkQualityDialogOpen}
        branchId={branchId}
        translationIds={selectedTranslationIds}
      />
    </div>
  );
}
