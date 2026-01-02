'use client';

import { use, useState, useCallback } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { toast } from 'sonner';
import { LoadingPulse } from '@/components/namespace-loader';
import type { PartOfSpeech, GlossaryEntry, GlossaryTag, MTProvider } from '@/lib/api';
import {
  useCreateGlossaryEntry,
  useUpdateGlossaryEntry,
  useDeleteGlossaryEntry,
  useCreateGlossaryTag,
  useDeleteGlossaryTag,
  useGlossaryImport,
  useGlossaryExport,
  useGlossarySync,
  useDeleteGlossarySync,
} from '@/hooks';
import { useGlossaryPageData } from './_hooks';
import {
  GlossaryStatsSection,
  GlossaryEntryList,
  GlossaryFiltersBar,
  GlossaryTagsSection,
  GlossaryProviderSyncSection,
  GlossaryEntryDialog,
  GlossaryTagDialog,
  GlossaryImportDialog,
  GlossaryTerminologyHeader,
  DeleteEntryDialog,
  DeleteTagDialog,
  type EntryFormData,
  type TagFormData,
} from './_components';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function GlossarySettingsPage({ params }: PageProps) {
  const { projectId } = use(params);
  const { t, ready } = useTranslation('glossary');

  // Filter State
  const [search, setSearch] = useState('');
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Dialog State
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<GlossaryEntry | null>(null);
  const [deletingTag, setDeletingTag] = useState<GlossaryTag | null>(null);

  // Data
  const {
    languages,
    entries,
    total,
    totalPages,
    stats,
    tags,
    syncStatuses,
    domains,
    isLoadingEntries,
  } = useGlossaryPageData({
    projectId,
    search,
    sourceLanguageFilter,
    domainFilter,
    tagFilter,
    page,
  });

  // Mutations
  const createEntry = useCreateGlossaryEntry(projectId);
  const updateEntry = useUpdateGlossaryEntry(projectId);
  const deleteEntry = useDeleteGlossaryEntry(projectId);
  const createTag = useCreateGlossaryTag(projectId);
  const deleteTag = useDeleteGlossaryTag(projectId);
  const importGlossary = useGlossaryImport(projectId);
  const exportGlossary = useGlossaryExport(projectId);
  const syncGlossary = useGlossarySync(projectId);
  const deleteSyncGlossary = useDeleteGlossarySync(projectId);

  // Entry Dialog Handlers
  const openEntryDialog = useCallback((entry?: GlossaryEntry) => {
    setEditingEntry(entry || null);
    setIsEntryDialogOpen(true);
  }, []);

  const handleEntrySubmit = useCallback(async (data: EntryFormData) => {
    try {
      if (editingEntry) {
        await updateEntry.mutateAsync({
          entryId: editingEntry.id,
          data: {
            sourceTerm: data.sourceTerm,
            context: data.context || null,
            notes: data.notes || null,
            partOfSpeech: data.partOfSpeech && data.partOfSpeech !== '__none__' ? (data.partOfSpeech as PartOfSpeech) : null,
            caseSensitive: data.caseSensitive,
            domain: data.domain || null,
            tagIds: data.tagIds,
          },
        });
        toast.success(t('toasts.entryUpdated'));
      } else {
        await createEntry.mutateAsync({
          sourceTerm: data.sourceTerm,
          sourceLanguage: data.sourceLanguage,
          context: data.context,
          notes: data.notes,
          partOfSpeech: data.partOfSpeech && data.partOfSpeech !== '__none__' ? (data.partOfSpeech as PartOfSpeech) : undefined,
          caseSensitive: data.caseSensitive,
          domain: data.domain,
          tagIds: data.tagIds,
          translations: data.translations.filter(t => t.targetTerm),
        });
        toast.success(t('toasts.entryCreated'));
      }
      setIsEntryDialogOpen(false);
    } catch {
      toast.error(t('toasts.entryFailed'));
    }
  }, [editingEntry, updateEntry, createEntry, t]);

  const handleDeleteEntry = useCallback(async () => {
    if (!deletingEntry) return;
    try {
      await deleteEntry.mutateAsync(deletingEntry.id);
      toast.success(t('toasts.entryDeleted'));
      setDeletingEntry(null);
    } catch {
      toast.error(t('toasts.deleteFailed'));
    }
  }, [deletingEntry, deleteEntry, t]);

  // Tag Dialog Handlers
  const handleTagSubmit = useCallback(async (data: TagFormData) => {
    try {
      await createTag.mutateAsync(data);
      toast.success(t('toasts.tagCreated'));
      setIsTagDialogOpen(false);
    } catch {
      toast.error(t('toasts.tagFailed'));
    }
  }, [createTag, t]);

  const handleDeleteTag = useCallback(async () => {
    if (!deletingTag) return;
    try {
      await deleteTag.mutateAsync(deletingTag.id);
      toast.success(t('toasts.tagDeleted'));
      setDeletingTag(null);
    } catch {
      toast.error(t('toasts.deleteTagFailed'));
    }
  }, [deletingTag, deleteTag, t]);

  // Import/Export Handlers
  const handleImport = useCallback(async (file: File, format: 'csv' | 'tbx', overwrite: boolean) => {
    try {
      await importGlossary.mutateAsync({ file, format, overwrite });
      toast.success(t('toasts.importSuccess'));
      setIsImportDialogOpen(false);
    } catch {
      toast.error(t('toasts.importFailed'));
    }
  }, [importGlossary, t]);

  const handleExport = useCallback(async (format: 'csv' | 'tbx') => {
    try {
      const blob = await exportGlossary.mutateAsync({ format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glossary.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('toasts.exportSuccess'));
    } catch {
      toast.error(t('toasts.exportFailed'));
    }
  }, [exportGlossary, t]);

  // Sync Handlers
  const handleSync = useCallback(async (provider: MTProvider, srcLang: string, tgtLang: string) => {
    try {
      await syncGlossary.mutateAsync({
        provider,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
      });
      const providerName = provider === 'DEEPL' ? 'DeepL' : 'Google Translate';
      toast.success(t('toasts.syncSuccess', { provider: providerName }));
    } catch {
      toast.error(t('toasts.syncFailed'));
    }
  }, [syncGlossary, t]);

  const handleDeleteSync = useCallback(async (provider: MTProvider, srcLang: string, tgtLang: string) => {
    try {
      await deleteSyncGlossary.mutateAsync({
        provider,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
      });
      toast.success(t('toasts.syncDeleted'));
    } catch {
      toast.error(t('toasts.syncDeleteFailed'));
    }
  }, [deleteSyncGlossary, t]);

  // Filter change handlers with page reset
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleSourceLanguageChange = useCallback((value: string) => {
    setSourceLanguageFilter(value);
    setPage(1);
  }, []);

  const handleDomainChange = useCallback((value: string) => {
    setDomainFilter(value);
    setPage(1);
  }, []);

  const handleTagChange = useCallback((value: string) => {
    setTagFilter(value);
    setPage(1);
  }, []);

  const hasFilters = search !== '' || sourceLanguageFilter !== 'all' || domainFilter !== 'all' || tagFilter !== 'all';
  // Show loading state while translations are loading
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingPulse />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Statistics Section */}
      <GlossaryStatsSection stats={stats} tagsCount={tags.length} />

      {/* Entries Section */}
      <section className="space-y-6 animate-fade-in-up stagger-3">
        <GlossaryTerminologyHeader
          onExportCsv={() => handleExport('csv')}
          onExportTbx={() => handleExport('tbx')}
          onImport={() => setIsImportDialogOpen(true)}
          onAddTerm={() => openEntryDialog()}
        />

        <GlossaryFiltersBar
          search={search}
          onSearchChange={handleSearchChange}
          sourceLanguageFilter={sourceLanguageFilter}
          onSourceLanguageChange={handleSourceLanguageChange}
          domainFilter={domainFilter}
          onDomainChange={handleDomainChange}
          tagFilter={tagFilter}
          onTagChange={handleTagChange}
          languages={languages}
          domains={domains}
          tags={tags}
          totalEntries={total}
        />

        <GlossaryEntryList
          entries={entries}
          isLoading={isLoadingEntries}
          hasFilters={hasFilters}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onEdit={openEntryDialog}
          onDelete={setDeletingEntry}
          onCreateFirst={() => openEntryDialog()}
        />
      </section>

      {/* Tags Section */}
      <GlossaryTagsSection
        tags={tags}
        onCreateTag={() => setIsTagDialogOpen(true)}
        onDeleteTag={setDeletingTag}
      />

      {/* Provider Sync Section */}
      <GlossaryProviderSyncSection
        syncStatuses={syncStatuses}
        stats={stats}
        isSyncing={syncGlossary.isPending}
        onSync={handleSync}
        onDeleteSync={handleDeleteSync}
      />

      {/* Entry Dialog */}
      <GlossaryEntryDialog
        open={isEntryDialogOpen}
        onOpenChange={setIsEntryDialogOpen}
        editingEntry={editingEntry}
        languages={languages}
        tags={tags}
        isSubmitting={createEntry.isPending || updateEntry.isPending}
        onSubmit={handleEntrySubmit}
      />

      {/* Tag Dialog */}
      <GlossaryTagDialog
        open={isTagDialogOpen}
        onOpenChange={setIsTagDialogOpen}
        isSubmitting={createTag.isPending}
        onSubmit={handleTagSubmit}
      />

      {/* Import Dialog */}
      <GlossaryImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        isImporting={importGlossary.isPending}
        onImport={handleImport}
      />

      {/* Delete Entry Confirmation */}
      <DeleteEntryDialog
        entry={deletingEntry}
        isDeleting={deleteEntry.isPending}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDeleteEntry}
      />

      {/* Delete Tag Confirmation */}
      <DeleteTagDialog
        tag={deletingTag}
        isDeleting={deleteTag.isPending}
        onClose={() => setDeletingTag(null)}
        onConfirm={handleDeleteTag}
      />
    </div>
  );
}
