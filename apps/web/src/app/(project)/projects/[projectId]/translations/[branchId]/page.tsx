'use client';

import { use, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  translationApi,
  branchApi,
  projectApi,
  TranslationKey,
  ApiError,
  ProjectTreeBranch,
  type ApprovalStatus,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  GitMerge,
  Filter,
  Loader2,
  Key,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  X,
  Sparkles,
  Globe,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { KeyFormDialog } from '@/components/key-form-dialog';
import { MergeBranchDialog } from '@/components/dialogs';
import {
  TranslationRow,
  BranchHeader,
  TranslationMemoryPanel,
} from '@/components/translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRecordTMUsage } from '@/hooks/use-translation-memory';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ projectId: string; branchId: string }>;
}

type FilterType = 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected';

export default function TranslationsPage({ params }: PageProps) {
  const { projectId, branchId } = use(params);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<TranslationKey | undefined>();
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [editingTranslations, setEditingTranslations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [filter, setFilter] = useState<FilterType>('all');

  // Language visibility - which languages to show in the list
  const [visibleLanguages, setVisibleLanguages] = useState<Set<string>>(new Set());
  const [savingKeys, setSavingKeys] = useState<Map<string, Set<string>>>(new Map());
  const [savedKeys, setSavedKeys] = useState<Map<string, Set<string>>>(new Map());
  const [approvingTranslations, setApprovingTranslations] = useState<Set<string>>(new Set());

  // Batch selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // TM focused translation state - tracks which key/language is being edited
  const [focusedTranslation, setFocusedTranslation] = useState<{
    keyId: string;
    language: string;
  } | null>(null);

  // Auto-save debounce refs
  const saveTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Translation Memory usage tracking
  const recordTMUsage = useRecordTMUsage(projectId);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchApi.get(branchId),
  });

  const { data: allBranchesData } = useQuery({
    queryKey: ['branches', branch?.space.id],
    queryFn: () => branchApi.list(branch!.space.id),
    enabled: !!branch?.space.id,
  });

  const allBranches: ProjectTreeBranch[] = useMemo(() => {
    if (!allBranchesData?.branches) return [];
    return allBranchesData.branches.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      isDefault: b.isDefault,
      keyCount: 0,
    }));
  }, [allBranchesData?.branches]);

  const { data, isLoading } = useQuery({
    queryKey: ['keys', branchId, search, page, filter],
    queryFn: () => translationApi.listKeys(branchId, { search, page, limit: 50, filter }),
  });

  const currentBranch: ProjectTreeBranch | null = useMemo(() => {
    if (!branch) return null;
    return {
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      isDefault: branch.isDefault,
      keyCount: data?.total || 0,
    };
  }, [branch, data?.total]);

  const updateTranslationMutation = useMutation({
    mutationFn: ({
      keyId,
      translations,
    }: {
      keyId: string;
      translations: Record<string, string>;
    }) => translationApi.updateKeyTranslations(keyId, translations),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      // Mark languages as saved
      const langs = Object.keys(variables.translations);
      setSavedKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(variables.keyId) || new Set();
        langs.forEach((l) => existing.add(l));
        next.set(variables.keyId, existing);
        return next;
      });
      // Clear saving state
      setSavingKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(variables.keyId);
        if (existing) {
          langs.forEach((l) => existing.delete(l));
          if (existing.size === 0) next.delete(variables.keyId);
        }
        return next;
      });
      // Clear saved indicator after 2s
      setTimeout(() => {
        setSavedKeys((prev) => {
          const next = new Map(prev);
          next.delete(variables.keyId);
          return next;
        });
      }, 2000);
    },
    onError: (error: ApiError, variables) => {
      toast.error('Failed to save translation', {
        description: error.message,
      });
      setSavingKeys((prev) => {
        const next = new Map(prev);
        next.delete(variables.keyId);
        return next;
      });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: ({
      translationId,
      status,
    }: {
      translationId: string;
      status: 'APPROVED' | 'REJECTED';
    }) => translationApi.setApprovalStatus(translationId, status),
    onMutate: ({ translationId }) => {
      setApprovingTranslations((prev) => new Set(prev).add(translationId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
    },
    onError: (error: ApiError) => {
      toast.error('Failed to update approval status', {
        description: error.message,
      });
    },
    onSettled: (_, __, { translationId }) => {
      setApprovingTranslations((prev) => {
        const next = new Set(prev);
        next.delete(translationId);
        return next;
      });
    },
  });

  const handleApprove = useCallback(async (translationId: string, status: 'APPROVED' | 'REJECTED') => {
    await approvalMutation.mutateAsync({ translationId, status });
  }, [approvalMutation]);

  // Determine if user can approve (MANAGER or OWNER)
  const canApprove = project?.myRole === 'MANAGER' || project?.myRole === 'OWNER';

  const languages = project?.languages || [];
  const keys = data?.keys || [];
  const defaultLanguage = languages.find((l) => l.isDefault);

  // Handle applying TM match to the focused translation
  const handleApplyTMMatch = useCallback(
    (targetText: string, matchId: string) => {
      if (!focusedTranslation) return;
      const { keyId, language } = focusedTranslation;

      // Update the translation
      setEditingTranslations((prev) => ({
        ...prev,
        [keyId]: {
          ...prev[keyId],
          [language]: targetText,
        },
      }));

      // Record TM usage
      recordTMUsage.mutate(matchId);
    },
    [focusedTranslation, recordTMUsage]
  );

  // Initialize visible languages when data loads (show all by default)
  useEffect(() => {
    if (languages.length > 0 && visibleLanguages.size === 0) {
      setVisibleLanguages(new Set(languages.map((l) => l.code)));
    }
  }, [languages, visibleLanguages.size]);

  // Calculate completion stats
  const completionStats = useMemo(() => {
    if (!keys.length || !languages.length) return { percent: 0, translated: 0, total: 0 };
    const totalTranslations = keys.length * languages.length;
    let translated = 0;
    keys.forEach((key) => {
      languages.forEach((lang) => {
        const value = key.translations.find((t) => t.language === lang.code)?.value;
        if (value) translated++;
      });
    });
    return {
      percent: Math.round((translated / totalTranslations) * 100),
      translated,
      total: totalTranslations,
    };
  }, [keys, languages]);

  // Keys are now filtered server-side via the API
  // No client-side filtering needed

  // Selection handlers for batch operations
  const handleSelectionChange = useCallback((keyId: string, selected: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(keyId);
      } else {
        next.delete(keyId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(keys.map((k) => k.id)));
    } else {
      setSelectedKeys(new Set());
    }
  }, [keys]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // Batch approval handler - chunks requests to stay under 100 per batch limit
  const handleBatchApprove = useCallback(async (status: 'APPROVED' | 'REJECTED') => {
    if (selectedKeys.size === 0) return;

    // Get all translation IDs from selected keys
    const translationIds: string[] = [];
    for (const keyId of selectedKeys) {
      const key = keys.find((k) => k.id === keyId);
      if (key) {
        for (const translation of key.translations) {
          if (translation.value && translation.status !== status) {
            translationIds.push(translation.id);
          }
        }
      }
    }

    if (translationIds.length === 0) {
      toast.info('No translations to update');
      return;
    }

    setIsBatchApproving(true);
    try {
      // Chunk into batches of 100 (API limit)
      const BATCH_SIZE = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < translationIds.length; i += BATCH_SIZE) {
        chunks.push(translationIds.slice(i, i + BATCH_SIZE));
      }

      // Process all chunks
      await Promise.all(
        chunks.map((chunk) => translationApi.batchApprove(branchId, chunk, status))
      );

      toast.success(`${translationIds.length} translations ${status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      clearSelection();
    } catch (error) {
      toast.error('Failed to update translations', {
        description: (error as ApiError).message,
      });
    } finally {
      setIsBatchApproving(false);
    }
  }, [selectedKeys, keys, branchId, queryClient, clearSelection]);

  const toggleLanguageVisibility = (langCode: string) => {
    setVisibleLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(langCode)) {
        // Don't allow hiding all languages
        if (next.size > 1) {
          next.delete(langCode);
        }
      } else {
        next.add(langCode);
      }
      return next;
    });
  };

  // Use ref to track pending saves to avoid stale closures
  const pendingSavesRef = useRef<Map<string, string>>(new Map());

  const handleTranslationChange = useCallback((
    keyId: string,
    lang: string,
    value: string
  ) => {
    // Track the value we want to save
    const saveKey = `${keyId}-${lang}`;
    pendingSavesRef.current.set(saveKey, value);

    setEditingTranslations((prev) => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        [lang]: value,
      },
    }));

    // Clear any existing timeout for this key
    const existingTimeout = saveTimeoutRefs.current.get(saveKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new auto-save timeout - read value from ref to avoid stale closure
    const timeout = setTimeout(async () => {
      const valueToSave = pendingSavesRef.current.get(saveKey);
      if (valueToSave === undefined) return;

      // Set saving state
      setSavingKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(keyId) || new Set();
        existing.add(lang);
        next.set(keyId, existing);
        return next;
      });

      try {
        await updateTranslationMutation.mutateAsync({
          keyId,
          translations: { [lang]: valueToSave }
        });

        // Clear from pending and editing state
        pendingSavesRef.current.delete(saveKey);
        setEditingTranslations((prev) => {
          const newState = { ...prev };
          if (newState[keyId]) {
            delete newState[keyId][lang];
            if (Object.keys(newState[keyId]).length === 0) {
              delete newState[keyId];
            }
          }
          return newState;
        });
      } catch {
        // Error is handled by mutation's onError
      }

      saveTimeoutRefs.current.delete(saveKey);
    }, 1500);

    saveTimeoutRefs.current.set(saveKey, timeout);
  }, [updateTranslationMutation]);

  const handleSaveTranslation = useCallback(async (keyId: string) => {
    // This is now only used for manual save - auto-save happens in handleTranslationChange
  }, []);

  function getTranslationValue(key: TranslationKey, lang: string): string {
    if (editingTranslations[key.id]?.[lang] !== undefined) {
      return editingTranslations[key.id][lang];
    }
    return key.translations.find((t) => t.language === lang)?.value || '';
  }

  const hasUnsavedChanges = useCallback((keyId: string, lang: string) => {
    return editingTranslations[keyId]?.[lang] !== undefined;
  }, [editingTranslations]);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
                <Link href={`/projects/${projectId}`}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">
                  {branch?.space.name} / {branch?.name}
                </div>
                <h1 className="text-lg font-semibold">Translations</h1>
              </div>
              <Button size="icon" onClick={() => setShowKeyDialog(true)} className="h-10 w-10">
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Language visibility toggles */}
            <div className="flex flex-wrap gap-1.5">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguageVisibility(lang.code)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold uppercase rounded-md transition-all',
                    visibleLanguages.has(lang.code)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {lang.code}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keys..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-10"
              />
            </div>
          </div>
        </div>

        {/* Mobile List */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground">No translation keys found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {keys.map((key) => (
                <TranslationRow
                  key={key.id}
                  translationKey={key}
                  languages={languages}
                  visibleLanguages={visibleLanguages}
                  getTranslationValue={getTranslationValue}
                  onTranslationChange={handleTranslationChange}
                  onSave={handleSaveTranslation}
                  hasUnsavedChanges={hasUnsavedChanges}
                  savingLanguages={savingKeys.get(key.id) || new Set()}
                  savedLanguages={savedKeys.get(key.id) || new Set()}
                  canApprove={canApprove}
                  onApprove={handleApprove}
                  approvingTranslations={approvingTranslations}
                  selectable={canApprove}
                  selected={selectedKeys.has(key.id)}
                  onSelectionChange={handleSelectionChange}
                />
              ))}
            </div>
          )}
        </div>

        <KeyFormDialog
          open={showKeyDialog}
          onOpenChange={(open) => {
            setShowKeyDialog(open);
            if (!open) setEditingKey(undefined);
          }}
          branchId={branchId}
          editKey={editingKey}
        />
      </div>
    );
  }

  // Desktop Layout - Two column with sidebar
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <div className="text-sm font-medium mb-1 flex items-center gap-1">
            <Link
              href={`/projects/${projectId}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {branch?.space.name}
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">{branch?.name}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Translations</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowMergeDialog(true)}
            className="gap-2"
            disabled={allBranches.length < 2}
          >
            <GitMerge className="h-4 w-4" />
            Merge
          </Button>
          <Button
            onClick={() => setShowKeyDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Key
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Main translations card */}
        <div className="flex-1 min-w-0 island overflow-hidden animate-fade-in-up stagger-1">
        {/* Card Header - Branch info & Language visibility toggles */}
        <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <BranchHeader
              branchName={branch?.name || 'main'}
              completionPercent={completionStats.percent}
            />

            {/* Language visibility toggles */}
            <div className="flex items-center gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguageVisibility(lang.code)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-semibold uppercase tracking-wider rounded-lg transition-all',
                    visibleLanguages.has(lang.code)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {lang.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3">
          {/* Select all checkbox - only show if user can approve */}
          {canApprove && keys.length > 0 && (
            <Checkbox
              checked={selectedKeys.size === keys.length && keys.length > 0}
              onCheckedChange={handleSelectAll}
              className="shrink-0"
            />
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keys..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 border-0 bg-transparent shadow-none focus-visible:ring-0 h-9"
            />
          </div>

          <Select value={filter} onValueChange={(v) => { setFilter(v as FilterType); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 border-0 bg-muted/50">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Keys</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            {data?.total ?? 0} keys
          </div>
        </div>

        {/* Batch actions toolbar - shows when items are selected */}
        {selectedKeys.size > 0 && canApprove && (
          <div className="px-5 py-3 border-b border-border/40 bg-primary/5 flex items-center gap-3 animate-slide-down overflow-hidden">
            {/* Selection count with badge styling */}
            <div className="flex items-center gap-2">
              <span
                key={selectedKeys.size}
                className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold tabular-nums animate-count-pulse"
              >
                {selectedKeys.size}
              </span>
              <span className="text-sm font-medium text-foreground">
                key{selectedKeys.size !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Action buttons with staggered animation */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-success border-success/30 hover:bg-success/10 hover:border-success/50 transition-all animate-slide-in-right stagger-1"
                onClick={() => handleBatchApprove('APPROVED')}
                disabled={isBatchApproving}
              >
                {isBatchApproving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ThumbsUp className="size-4" />
                )}
                Approve All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 transition-all animate-slide-in-right stagger-2"
                onClick={() => handleBatchApprove('REJECTED')}
                disabled={isBatchApproving}
              >
                {isBatchApproving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ThumbsDown className="size-4" />
                )}
                Reject All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="animate-slide-in-right stagger-3 hover:bg-muted"
                onClick={clearSelection}
                disabled={isBatchApproving}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Translation rows */}
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading translations...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Key className="size-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No translation keys yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first translation key to start localizing.
            </p>
            <Button onClick={() => setShowKeyDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Key
            </Button>
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No keys match the current filter.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {keys.map((key) => (
              <TranslationRow
                key={key.id}
                translationKey={key}
                languages={languages}
                visibleLanguages={visibleLanguages}
                getTranslationValue={getTranslationValue}
                onTranslationChange={handleTranslationChange}
                onSave={handleSaveTranslation}
                hasUnsavedChanges={hasUnsavedChanges}
                savingLanguages={savingKeys.get(key.id) || new Set()}
                savedLanguages={savedKeys.get(key.id) || new Set()}
                canApprove={canApprove}
                onApprove={handleApprove}
                approvingTranslations={approvingTranslations}
                selectable={canApprove}
                selected={selectedKeys.has(key.id)}
                onSelectionChange={handleSelectionChange}
                onTranslationFocus={(keyId, language) =>
                  setFocusedTranslation({ keyId, language })
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 50 && (
          <div className="px-5 py-4 border-t border-border/40 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground font-mono px-2">
              {page} / {Math.ceil(data.total / 50)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(data.total / 50)}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
        </div>

        {/* Right Sidebar - Translation Assistance */}
        <div className="w-80 shrink-0 space-y-4 animate-fade-in-up stagger-2">
          {/* Translation Memory Panel */}
          <div className="island p-0 overflow-hidden">
            {(() => {
              const focusedKey = focusedTranslation
                ? keys.find((k) => k.id === focusedTranslation.keyId)
                : null;

              // Show TM panel when editing a non-default language
              const showTMContent =
                focusedTranslation &&
                defaultLanguage &&
                focusedKey &&
                focusedTranslation.language !== defaultLanguage.code;

              if (showTMContent) {
                return (
                  <TranslationMemoryPanel
                    projectId={projectId}
                    sourceText={getTranslationValue(focusedKey, defaultLanguage.code)}
                    sourceLanguage={defaultLanguage.code}
                    targetLanguage={focusedTranslation.language}
                    onApplyMatch={handleApplyTMMatch}
                    isVisible={true}
                  />
                );
              }

              // Default empty state
              return (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Translation Memory</span>
                  </div>
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
                      <Database className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click on a translation to see suggestions
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      from previously translated text
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* AI Translation - Coming Soon */}
          <div className="island p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">AI Translation</span>
              <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Coming Soon
              </span>
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="size-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                AI-powered translations
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Smart context-aware suggestions
              </p>
            </div>
          </div>

          {/* Machine Translation - Coming Soon */}
          <div className="island p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Machine Translation</span>
              <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Coming Soon
              </span>
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mx-auto mb-2">
                <Globe className="size-5 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                Google, DeepL & more
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Integrate with translation engines
              </p>
            </div>
          </div>
        </div>
      </div>

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

      <MergeBranchDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        projectId={projectId}
        sourceBranch={currentBranch}
        allBranches={allBranches}
      />
    </div>
  );
}
