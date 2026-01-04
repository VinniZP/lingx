'use client';

import { BulkTranslateProgress } from '@/components/bulk-translate-progress';
import { KeyFormDialog } from '@/components/key-form-dialog';
import { BulkQualityEvaluationDialog } from '@/components/translations/bulk-quality-evaluation-dialog';
import { useKeySuggestions, useLocalStorage, useRecordTMUsage } from '@/hooks';
import { useBulkTranslateJob } from '@/hooks/use-bulk-translate-job';
import type { TranslationKey } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BulkDeleteKeysDialog } from './_components/BulkDeleteKeysDialog';
import { WorkbenchCommandPalette, type CommandHandlers } from './_components/CommandPalette';
import { FloatingBatchBar } from './_components/FloatingBatchBar';
import { KeyEditorPanel } from './_components/KeyEditorPanel';
import { KeyListSidebar } from './_components/KeyListSidebar';
import { STORAGE_KEY, WorkbenchGuideDialog } from './_components/WorkbenchGuide';
import { WorkbenchToolbar } from './_components/WorkbenchToolbar';
import {
  useKeyboardNavigation,
  useKeySelection,
  useTMSuggestions,
  useTranslationMutations,
  useTranslationsPageData,
  type FilterType,
  type QualityFilterType,
} from './_hooks';

interface PageProps {
  params: Promise<{ projectId: string; branchId: string }>;
}

export default function WorkbenchPage({ params }: PageProps) {
  const { projectId, branchId } = use(params);
  const { t } = useTranslation();

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
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Guide dialog state (persisted in localStorage)
  const [hasSeenGuide, setHasSeenGuide] = useLocalStorage(STORAGE_KEY, false);

  // Language row expansion state (lifted for keyboard navigation)
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());

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
  const { selectedKeys, handleSelectionChange, handleSelectAll, clearSelection, isAllSelected } =
    useKeySelection({ keys });

  // Expansion handlers
  const handleExpandLanguage = useCallback((lang: string, expanded: boolean) => {
    setExpandedLanguages((prev) => {
      const next = new Set(prev);
      if (expanded) {
        next.add(lang);
      } else {
        next.delete(lang);
      }
      return next;
    });
  }, []);

  const handleCollapseAllLanguages = useCallback(() => {
    setExpandedLanguages(new Set());
  }, []);

  // Get target language objects for expansion logic
  const targetLanguageObjects = useMemo(() => {
    return languages.filter((l) => !l.isDefault);
  }, [languages]);

  // Auto-expand languages based on status when key changes
  useEffect(() => {
    if (!selectedKeyId) {
      setExpandedLanguages(new Set());
      return;
    }

    const selectedKey = keys.find((k) => k.id === selectedKeyId);
    if (!selectedKey) return;

    const toExpand = new Set<string>();
    targetLanguageObjects.forEach((lang) => {
      const translation = selectedKey.translations.find((t) => t.language === lang.code);
      const value = translation?.value || '';
      const status = !value ? 'empty' : translation?.status || 'PENDING';

      // Auto-expand empty, pending, or rejected
      if (status === 'empty' || status === 'PENDING' || status === 'REJECTED') {
        toExpand.add(lang.code);
      }
    });
    setExpandedLanguages(toExpand);
  }, [selectedKeyId, keys, targetLanguageObjects]);

  // Auto-show guide dialog on first visit
  useEffect(() => {
    if (!hasSeenGuide && !isLoading && keys.length > 0) {
      const timer = setTimeout(() => setShowGuideDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenGuide, isLoading, keys.length]);

  // Guide dialog handlers
  const handleGuideComplete = useCallback(() => setHasSeenGuide(true), [setHasSeenGuide]);
  const handleShowGuide = useCallback(() => setShowGuideDialog(true), []);

  // Stable string representation for dependency arrays (Sets lack equality checking)
  const selectedKeysString = useMemo(
    () => Array.from(selectedKeys).sort().join(','),
    [selectedKeys]
  );

  // Compute translation IDs from selected keys for quality evaluation
  const selectedTranslationIds = useMemo(() => {
    if (selectedKeys.size === 0) return undefined;
    return keys
      .filter((key) => selectedKeys.has(key.id))
      .flatMap((key) => key.translations.map((t) => t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use stable string instead of Set
  }, [selectedKeysString, keys]);

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
  const sourceText =
    selectedKey && defaultLanguage ? getTranslationValue(selectedKey, defaultLanguage.code) : '';

  useTMSuggestions({
    projectId,
    expandedKeyId: selectedKeyId,
    sourceText,
    sourceLanguage: defaultLanguage?.code,
    targetLanguages,
    setSuggestion,
  });

  // Handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage]
  );

  const handleFilterChange = useCallback(
    (value: FilterType) => {
      setFilter(value);
      setPage(1);
    },
    [setFilter, setPage]
  );

  const handleNamespaceChange = useCallback(
    (value: string) => {
      setNamespace(value);
      setPage(1);
    },
    [setNamespace, setPage]
  );

  const handleApplySuggestion = useCallback(
    (keyId: string, lang: string, text: string, suggestionId: string) => {
      handleTranslationChange(keyId, lang, text);
      if (!suggestionId.startsWith('tm-') && !suggestionId.startsWith('mt-')) {
        recordTMUsage.mutate(suggestionId);
      }
    },
    [handleTranslationChange, recordTMUsage]
  );

  // Get current translation ID for approve shortcut
  const getCurrentTranslationId = useCallback(
    (lang: string) => {
      if (!selectedKeyId) return undefined;
      const selectedKeyData = keys.find((k) => k.id === selectedKeyId);
      return selectedKeyData?.translations.find((t) => t.language === lang)?.id;
    },
    [selectedKeyId, keys]
  );

  // Get suggestion count for a language
  const getSuggestionCount = useCallback(
    (lang: string) => {
      if (!selectedKeyId) return 0;
      return getSuggestions(selectedKeyId).get(lang)?.length ?? 0;
    },
    [selectedKeyId, getSuggestions]
  );

  // Apply suggestion by index
  const handleApplySuggestionByIndex = useCallback(
    (lang: string, index: number) => {
      if (!selectedKeyId) return;
      const langSuggestions = getSuggestions(selectedKeyId).get(lang);
      const suggestion = langSuggestions?.[index];
      if (suggestion) {
        handleApplySuggestion(selectedKeyId, lang, suggestion.text, suggestion.id);
      }
    },
    [selectedKeyId, getSuggestions, handleApplySuggestion]
  );

  // MT/AI fetch handlers for keyboard shortcuts (use selectedKeyId)
  const handleFetchMTForKeyboard = useCallback(
    (lang: string) => {
      if (!selectedKeyId) return;
      const key = keys.find((k) => k.id === selectedKeyId);
      if (!key || !defaultLanguage) return;
      const source = getTranslationValue(key, defaultLanguage.code);
      if (!source) return;
      fetchMT(selectedKeyId, source, defaultLanguage.code, lang);
    },
    [selectedKeyId, keys, defaultLanguage, getTranslationValue, fetchMT]
  );

  const handleFetchAIForKeyboard = useCallback(
    (lang: string) => {
      if (!selectedKeyId) return;
      const key = keys.find((k) => k.id === selectedKeyId);
      if (!key || !defaultLanguage) return;
      const source = getTranslationValue(key, defaultLanguage.code);
      if (!source) return;
      fetchAI(selectedKeyId, source, defaultLanguage.code, lang);
    },
    [selectedKeyId, keys, defaultLanguage, getTranslationValue, fetchAI]
  );

  // Command palette toggle
  const handleToggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen((prev) => !prev);
  }, []);

  // Keyboard navigation hook
  const {
    focusMode,
    focusedLanguage,
    keyListContainerRef,
    sourceTextareaRef,
    isKeyFocused,
    isLanguageFocused,
    isSuggestionFocused,
    registerLanguageTextarea,
    handleSourceFocus,
    handleLanguageFocus,
    focusSource,
    focusKeyById,
    navigateKey,
  } = useKeyboardNavigation({
    keys,
    selectedKeyId,
    onSelectKey: setSelectedKeyId,
    page,
    totalPages,
    onPageChange: setPage,
    languages,
    defaultLanguage: defaultLanguage ?? null,
    expandedLanguages,
    onExpandLanguage: handleExpandLanguage,
    onCollapseAllLanguages: handleCollapseAllLanguages,
    onApprove: handleApprove,
    getCurrentTranslationId,
    getSuggestionCount,
    onApplySuggestion: handleApplySuggestionByIndex,
    onFetchMT: handleFetchMTForKeyboard,
    onFetchAI: handleFetchAIForKeyboard,
    hasMT,
    hasAI,
    onOpenCommandPalette: handleToggleCommandPalette,
    commandPaletteOpen,
  });

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

  // Command palette handlers
  const commandPaletteHandlers = useMemo<CommandHandlers>(() => {
    return {
      // Translation actions
      onFetchAI: (keyId: string, lang: string) => handleFetchAI(keyId, lang),
      onFetchAIAll: (keyId: string) => {
        targetLanguages.forEach((lang) => handleFetchAI(keyId, lang));
      },
      onFetchMT: (keyId: string, lang: string) => handleFetchMT(keyId, lang),
      onFetchMTAll: (keyId: string) => {
        targetLanguages.forEach((lang) => handleFetchMT(keyId, lang));
      },
      onCopySource: (keyId: string, lang: string) => {
        const key = keys.find((k) => k.id === keyId);
        if (!key || !defaultLanguage) return;
        const sourceValue = getTranslationValue(key, defaultLanguage.code);
        if (sourceValue) {
          handleTranslationChange(keyId, lang, sourceValue);
        }
      },

      // Approval actions
      onApprove: (translationId: string) => handleApprove(translationId, 'APPROVED'),
      onApproveAll: (keyId: string) => {
        const key = keys.find((k) => k.id === keyId);
        if (!key) return;
        key.translations.forEach((t) => {
          // Only approve non-empty translations
          if (t.value?.trim()) handleApprove(t.id, 'APPROVED');
        });
      },
      onReject: (translationId: string) => handleApprove(translationId, 'REJECTED'),
      onRejectAll: (keyId: string) => {
        const key = keys.find((k) => k.id === keyId);
        if (!key) return;
        key.translations.forEach((t) => {
          // Only reject non-empty translations
          if (t.value?.trim()) handleApprove(t.id, 'REJECTED');
        });
      },

      // Navigation actions
      onSelectKey: focusKeyById,
      onNextKey: () => navigateKey('down'),
      onPrevKey: () => navigateKey('up'),
      onExpandAll: () => {
        targetLanguages.forEach((lang) => handleExpandLanguage(lang, true));
      },
      onCollapseAll: handleCollapseAllLanguages,
      onFocusSource: focusSource,

      // Utility actions
      onCopyKeyName: (keyName: string) => {
        navigator.clipboard.writeText(keyName);
        toast.success(t('workbench.toasts.copiedToClipboard'));
      },
      onDeleteKey: (keyId: string) => {
        handleBulkDelete(new Set([keyId]), () => {
          if (selectedKeyId === keyId) setSelectedKeyId(null);
        });
      },
      onShowShortcuts: handleShowGuide,
      onEvaluateQuality: () => setBulkQualityDialogOpen(true),

      // Context getters
      getCurrentTranslationId,
      getKeyName: (keyId: string) => keys.find((k) => k.id === keyId)?.name,
    };
  }, [
    t,
    targetLanguages,
    keys,
    defaultLanguage,
    getTranslationValue,
    handleTranslationChange,
    handleApprove,
    handleFetchAI,
    handleFetchMT,
    handleExpandLanguage,
    handleCollapseAllLanguages,
    handleBulkDelete,
    navigateKey,
    focusKeyById,
    focusSource,
    handleShowGuide,
    getCurrentTranslationId,
    selectedKeyId,
  ]);

  const onBatchApprove = useCallback(
    async (status: 'APPROVED' | 'REJECTED') => {
      await handleBatchApprove(status, selectedKeys, keys, clearSelection);
    },
    [handleBatchApprove, selectedKeys, keys, clearSelection]
  );

  const onBulkDelete = useCallback(() => {
    setBulkDeleteDialogOpen(true);
  }, []);

  const onConfirmBulkDelete = useCallback(async () => {
    await handleBulkDelete(selectedKeys, () => {
      clearSelection();
      setBulkDeleteDialogOpen(false);
    });
  }, [handleBulkDelete, selectedKeys, clearSelection]);

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
    <div className="flex h-full flex-col">
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
        onShowGuide={handleShowGuide}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Key List Sidebar */}
        <KeyListSidebar
          ref={keyListContainerRef}
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
          isKeyFocused={isKeyFocused}
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
          // Keyboard navigation props
          expandedLanguages={expandedLanguages}
          onExpandLanguage={handleExpandLanguage}
          sourceTextareaRef={sourceTextareaRef}
          registerLanguageTextarea={registerLanguageTextarea}
          isLanguageFocused={isLanguageFocused}
          isSuggestionFocused={isSuggestionFocused}
          focusMode={focusMode}
          onSourceFocus={handleSourceFocus}
          onLanguageFocus={handleLanguageFocus}
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

      <BulkDeleteKeysDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedKeys.size}
        isDeleting={isBulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />

      <WorkbenchGuideDialog
        open={showGuideDialog}
        onOpenChange={setShowGuideDialog}
        onComplete={handleGuideComplete}
      />

      {/* Command Palette */}
      <WorkbenchCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        keys={keys}
        languages={languages}
        projectId={projectId}
        selectedKeyId={selectedKeyId}
        focusedLanguage={focusedLanguage}
        expandedLanguages={expandedLanguages}
        hasMT={hasMT}
        hasAI={hasAI}
        handlers={commandPaletteHandlers}
      />
    </div>
  );
}
