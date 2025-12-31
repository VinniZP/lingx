'use client';

import { use, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  translationApi,
  translationMemoryApi,
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
  Keyboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { KeyFormDialog } from '@/components/key-form-dialog';
import { MergeBranchDialog } from '@/components/dialogs';
import {
  TranslationKeyCard,
  BranchHeader,
  TranslationCommandPalette,
} from '@/components/translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeySuggestions, useKeyboardNavigation, useRecordTMUsage, useTranslationMemorySearch } from '@/hooks';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';
import type { UnifiedSuggestion } from '@/hooks/use-suggestions';

interface PageProps {
  params: Promise<{ projectId: string; branchId: string }>;
}

type FilterType = 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected';

export default function TranslationsPage({ params }: PageProps) {
  const { projectId, branchId } = use(params);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Core state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<TranslationKey | undefined>();
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Translation editing state
  const [editingTranslations, setEditingTranslations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [savingKeys, setSavingKeys] = useState<Map<string, Set<string>>>(new Map());
  const [savedKeys, setSavedKeys] = useState<Map<string, Set<string>>>(new Map());
  const [approvingTranslations, setApprovingTranslations] = useState<Set<string>>(new Set());

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Expanded key state (new UX)
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Auto-save refs
  const saveTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingSavesRef = useRef<Map<string, string>>(new Map());

  // TM and suggestions
  const recordTMUsage = useRecordTMUsage(projectId);
  const { getSuggestions, setSuggestion, fetchMT, getFetchingMTSet, hasMT } = useKeySuggestions(projectId);

  // Queries
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

  const languages = project?.languages || [];
  const keys = data?.keys || [];
  const defaultLanguage = languages.find((l) => l.isDefault);
  const canApprove = project?.myRole === 'MANAGER' || project?.myRole === 'OWNER';

  // Keyboard navigation
  const {
    focusedKeyIndex,
    setFocusedKeyIndex,
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

  // Fetch TM suggestions when key is expanded
  const expandedKey = expandedKeyId ? keys.find(k => k.id === expandedKeyId) : null;
  const sourceText = expandedKey && defaultLanguage
    ? getTranslationValue(expandedKey, defaultLanguage.code)
    : '';

  // TM search for all target languages when key is expanded
  const targetLanguages = useMemo(
    () => languages.filter(l => !l.isDefault).map(l => l.code),
    [languages]
  );

  // Track which keys we've already fetched TM for to avoid duplicate requests
  const fetchedTMKeysRef = useRef<Set<string>>(new Set());

  // Fetch TM for each target language (only once per key)
  useEffect(() => {
    if (!expandedKeyId || !sourceText || sourceText.length < 3 || !defaultLanguage) return;

    // Skip if we've already fetched for this key
    if (fetchedTMKeysRef.current.has(expandedKeyId)) return;
    fetchedTMKeysRef.current.add(expandedKeyId);

    // Fetch TM for all target languages with a small delay between each to avoid rate limits
    const fetchTM = async () => {
      for (const targetLang of targetLanguages) {
        try {
          const result = await translationMemoryApi.search(projectId, {
            sourceText,
            sourceLanguage: defaultLanguage.code,
            targetLanguage: targetLang,
            minSimilarity: 0.6,
            limit: 5,
          });

          if (result.matches && result.matches.length > 0) {
            const suggestions: UnifiedSuggestion[] = result.matches.map(match => ({
              id: match.id,
              type: 'tm' as const,
              text: match.targetText,
              confidence: Math.round(match.similarity * 100),
              source: match.sourceText.substring(0, 30) + (match.sourceText.length > 30 ? '...' : ''),
            }));
            setSuggestion(expandedKeyId, targetLang, suggestions);
          }
        } catch (error) {
          // Silent fail for TM search
          console.error('[TM] Search failed:', error);
        }
      }
    };

    fetchTM();
  }, [expandedKeyId, sourceText, defaultLanguage, targetLanguages, projectId, setSuggestion]);

  // Mutations
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
      const langs = Object.keys(variables.translations);
      setSavedKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(variables.keyId) || new Set();
        langs.forEach((l) => existing.add(l));
        next.set(variables.keyId, existing);
        return next;
      });
      setSavingKeys((prev) => {
        const next = new Map(prev);
        const existing = next.get(variables.keyId);
        if (existing) {
          langs.forEach((l) => existing.delete(l));
          if (existing.size === 0) next.delete(variables.keyId);
        }
        return next;
      });
      setTimeout(() => {
        setSavedKeys((prev) => {
          const next = new Map(prev);
          next.delete(variables.keyId);
          return next;
        });
      }, 2000);
    },
    onError: (error: ApiError, variables) => {
      toast.error('Failed to save translation', { description: error.message });
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
      toast.error('Failed to update approval status', { description: error.message });
    },
    onSettled: (_, __, { translationId }) => {
      setApprovingTranslations((prev) => {
        const next = new Set(prev);
        next.delete(translationId);
        return next;
      });
    },
  });

  // Handlers
  function getTranslationValue(key: TranslationKey, lang: string): string {
    if (editingTranslations[key.id]?.[lang] !== undefined) {
      return editingTranslations[key.id][lang];
    }
    return key.translations.find((t) => t.language === lang)?.value || '';
  }

  const handleTranslationChange = useCallback((keyId: string, lang: string, value: string) => {
    const saveKey = `${keyId}-${lang}`;
    pendingSavesRef.current.set(saveKey, value);

    setEditingTranslations((prev) => ({
      ...prev,
      [keyId]: { ...prev[keyId], [lang]: value },
    }));

    const existingTimeout = saveTimeoutRefs.current.get(saveKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(async () => {
      const valueToSave = pendingSavesRef.current.get(saveKey);
      if (valueToSave === undefined) return;

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
          translations: { [lang]: valueToSave },
        });
        pendingSavesRef.current.delete(saveKey);
        setEditingTranslations((prev) => {
          const newState = { ...prev };
          if (newState[keyId]) {
            delete newState[keyId][lang];
            if (Object.keys(newState[keyId]).length === 0) delete newState[keyId];
          }
          return newState;
        });
      } catch {}

      saveTimeoutRefs.current.delete(saveKey);
    }, 1500);

    saveTimeoutRefs.current.set(saveKey, timeout);
  }, [updateTranslationMutation]);

  const handleApprove = useCallback(async (translationId: string, status: 'APPROVED' | 'REJECTED') => {
    await approvalMutation.mutateAsync({ translationId, status });
  }, [approvalMutation]);

  const handleApplySuggestion = useCallback((keyId: string, lang: string, text: string, suggestionId: string) => {
    handleTranslationChange(keyId, lang, text);
    if (suggestionId.startsWith('tm-') === false && !suggestionId.startsWith('mt-')) {
      recordTMUsage.mutate(suggestionId);
    }
  }, [handleTranslationChange, recordTMUsage]);

  const handleFetchMT = useCallback((keyId: string, lang: string) => {
    const key = keys.find(k => k.id === keyId);
    if (!key || !defaultLanguage) return;
    const sourceText = getTranslationValue(key, defaultLanguage.code);
    if (!sourceText) return;
    fetchMT(keyId, sourceText, defaultLanguage.code, lang);
  }, [keys, defaultLanguage, fetchMT]);

  // Selection handlers
  const handleSelectionChange = useCallback((keyId: string, selected: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (selected) next.add(keyId);
      else next.delete(keyId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) setSelectedKeys(new Set(keys.map((k) => k.id)));
    else setSelectedKeys(new Set());
  }, [keys]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const handleBatchApprove = useCallback(async (status: 'APPROVED' | 'REJECTED') => {
    if (selectedKeys.size === 0) return;

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
      const BATCH_SIZE = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < translationIds.length; i += BATCH_SIZE) {
        chunks.push(translationIds.slice(i, i + BATCH_SIZE));
      }
      await Promise.all(chunks.map((chunk) => translationApi.batchApprove(branchId, chunk, status)));
      toast.success(`${translationIds.length} translations ${status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      clearSelection();
    } catch (error) {
      toast.error('Failed to update translations', { description: (error as ApiError).message });
    } finally {
      setIsBatchApproving(false);
    }
  }, [selectedKeys, keys, branchId, queryClient, clearSelection]);

  // Completion stats
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

  // Mobile layout (simplified)
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keys..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 h-10"
              />
            </div>
          </div>
        </div>
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
              {keys.map((key, index) => (
                <TranslationKeyCard
                  key={key.id}
                  translationKey={key}
                  languages={languages}
                  defaultLanguage={defaultLanguage}
                  isExpanded={expandedKeyId === key.id}
                  onExpand={setExpandedKeyId}
                  getTranslationValue={(k, lang) => getTranslationValue(k, lang)}
                  onTranslationChange={handleTranslationChange}
                  savingLanguages={savingKeys.get(key.id) || new Set()}
                  savedLanguages={savedKeys.get(key.id) || new Set()}
                  canApprove={canApprove}
                  onApprove={handleApprove}
                  approvingTranslations={approvingTranslations}
                  selectable={canApprove}
                  selected={selectedKeys.has(key.id)}
                  onSelectionChange={handleSelectionChange}
                  suggestions={getSuggestions(key.id)}
                  onApplySuggestion={(lang, text, id) => handleApplySuggestion(key.id, lang, text, id)}
                  onFetchMT={(lang) => handleFetchMT(key.id, lang)}
                  isFetchingMT={getFetchingMTSet(key.id)}
                  focusedLanguage={expandedKeyId === key.id ? focusedLanguage : null}
                  onFocusLanguage={focusLanguage}
                  isFocusedKey={isKeyIdFocused(key.id)}
                  onKeyboardNavigate={handleKeyboardNavigate}
                />
              ))}
            </div>
          )}
        </div>
        <KeyFormDialog
          open={showKeyDialog}
          onOpenChange={(open) => { setShowKeyDialog(open); if (!open) setEditingKey(undefined); }}
          branchId={branchId}
          editKey={editingKey}
        />
      </div>
    );
  }

  // Desktop Layout - New expandable card design
  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Keyboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1.5 text-xs">
                <div><kbd className="font-kbd text-[11px] bg-background/20 text-inherit px-1.5 py-0.5 rounded tracking-wide">↑↓</kbd> Navigate keys</div>
                <div><kbd className="font-kbd text-[11px] bg-background/20 text-inherit px-1.5 py-0.5 rounded">Tab</kbd> Switch fields</div>
                <div><Kbd variant="pill">↵</Kbd> Apply suggestion</div>
                <div><Kbd variant="pill">M</Kbd> Machine translate</div>
                <div><kbd className="font-kbd text-[11px] bg-background/20 text-inherit px-1.5 py-0.5 rounded">Esc</kbd> Collapse</div>
              </div>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            onClick={() => setShowMergeDialog(true)}
            className="gap-2"
            disabled={allBranches.length < 2}
          >
            <GitMerge className="h-4 w-4" />
            Merge
          </Button>
          <Button onClick={() => setShowKeyDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Key
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <div className="island overflow-hidden animate-fade-in-up stagger-1">
        {/* Card Header */}
        <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <BranchHeader
              branchName={branch?.name || 'main'}
              completionPercent={completionStats.percent}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="tabular-nums font-medium">{data?.total ?? 0}</span>
              <span>keys</span>
              <span className="text-border">•</span>
              <span className="tabular-nums font-medium">{languages.length}</span>
              <span>languages</span>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3">
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
        </div>

        {/* Batch actions toolbar */}
        {selectedKeys.size > 0 && canApprove && (
          <div className="px-5 py-3 border-b border-border/40 bg-primary/5 flex items-center gap-3 animate-slide-down">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold tabular-nums">
                {selectedKeys.size}
              </span>
              <span className="text-sm font-medium text-foreground">
                key{selectedKeys.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-success border-success/30 hover:bg-success/10"
                onClick={() => handleBatchApprove('APPROVED')}
                disabled={isBatchApproving}
              >
                {isBatchApproving ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4" />}
                Approve All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => handleBatchApprove('REJECTED')}
                disabled={isBatchApproving}
              >
                {isBatchApproving ? <Loader2 className="size-4 animate-spin" /> : <ThumbsDown className="size-4" />}
                Reject All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isBatchApproving}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Key List */}
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading translations...</p>
          </div>
        ) : keys.length === 0 && !search ? (
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
            No keys match your search or filter.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {keys.map((key, index) => (
              <TranslationKeyCard
                key={key.id}
                translationKey={key}
                languages={languages}
                defaultLanguage={defaultLanguage}
                isExpanded={expandedKeyId === key.id}
                onExpand={setExpandedKeyId}
                getTranslationValue={(k, lang) => getTranslationValue(k, lang)}
                onTranslationChange={handleTranslationChange}
                savingLanguages={savingKeys.get(key.id) || new Set()}
                savedLanguages={savedKeys.get(key.id) || new Set()}
                canApprove={canApprove}
                onApprove={handleApprove}
                approvingTranslations={approvingTranslations}
                selectable={canApprove}
                selected={selectedKeys.has(key.id)}
                onSelectionChange={handleSelectionChange}
                suggestions={getSuggestions(key.id)}
                onApplySuggestion={(lang, text, id) => handleApplySuggestion(key.id, lang, text, id)}
                onFetchMT={(lang) => handleFetchMT(key.id, lang)}
                isFetchingMT={getFetchingMTSet(key.id)}
                focusedLanguage={expandedKeyId === key.id ? focusedLanguage : null}
                onFocusLanguage={focusLanguage}
                isFocusedKey={isKeyIdFocused(key.id)}
                onKeyboardNavigate={handleKeyboardNavigate}
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

      {/* Dialogs */}
      <KeyFormDialog
        open={showKeyDialog}
        onOpenChange={(open) => { setShowKeyDialog(open); if (!open) setEditingKey(undefined); }}
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
          focusLanguage(null); // Reset to let card pick first language
        }}
        onFetchMT={(lang) => {
          if (expandedKeyId) {
            handleFetchMT(expandedKeyId, lang);
          }
        }}
        onFetchMTAll={() => {
          if (expandedKeyId) {
            targetLanguages.forEach((lang) => handleFetchMT(expandedKeyId, lang));
          }
        }}
        onCopyFromSource={(lang) => {
          if (expandedKeyId && defaultLanguage) {
            const key = keys.find(k => k.id === expandedKeyId);
            if (key) {
              const sourceText = getTranslationValue(key, defaultLanguage.code);
              if (sourceText) {
                setEditingTranslations((prev) => ({
                  ...prev,
                  [expandedKeyId]: {
                    ...prev[expandedKeyId],
                    [lang]: sourceText,
                  },
                }));
              }
            }
          }
        }}
        onApprove={(translationId) => handleApprove(translationId, 'APPROVED')}
        onReject={(translationId) => handleApprove(translationId, 'REJECTED')}
        onApproveKey={async (translationIds) => {
          if (translationIds.length === 0) return;
          try {
            await translationApi.batchApprove(branchId, translationIds, 'APPROVED');
            toast.success(`${translationIds.length} translations approved`);
            queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
          } catch (error) {
            toast.error('Failed to approve translations', { description: (error as ApiError).message });
          }
        }}
        onRejectKey={async (translationIds) => {
          if (translationIds.length === 0) return;
          try {
            await translationApi.batchApprove(branchId, translationIds, 'REJECTED');
            toast.success(`${translationIds.length} translations rejected`);
            queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
          } catch (error) {
            toast.error('Failed to reject translations', { description: (error as ApiError).message });
          }
        }}
        hasMT={hasMT}
      />
    </div>
  );
}
