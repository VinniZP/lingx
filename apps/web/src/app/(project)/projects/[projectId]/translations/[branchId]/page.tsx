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
} from 'lucide-react';
import { toast } from 'sonner';
import { KeyFormDialog } from '@/components/key-form-dialog';
import { MergeBranchDialog } from '@/components/dialogs';
import {
  TranslationRow,
  BranchHeader,
} from '@/components/translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ projectId: string; branchId: string }>;
}

type FilterType = 'all' | 'missing' | 'complete';

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

  // Auto-save debounce refs
  const saveTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
    queryKey: ['keys', branchId, search, page],
    queryFn: () => translationApi.listKeys(branchId, { search, page, limit: 50 }),
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

  const languages = project?.languages || [];
  const keys = data?.keys || [];

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

  // Filter keys
  const filteredKeys = useMemo(() => {
    let result = [...keys];

    if (filter === 'missing') {
      result = result.filter((key) =>
        languages.some((lang) => {
          const value = key.translations.find((t) => t.language === lang.code)?.value;
          return !value;
        })
      );
    } else if (filter === 'complete') {
      result = result.filter((key) =>
        languages.every((lang) => {
          const value = key.translations.find((t) => t.language === lang.code)?.value;
          return !!value;
        })
      );
    }

    return result;
  }, [keys, filter, languages]);

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
          ) : filteredKeys.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground">No translation keys found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredKeys.map((key) => (
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

  // Desktop Layout - Unified List Design
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

      {/* Main Card */}
      <div className="island overflow-hidden animate-fade-in-up stagger-1">
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

          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[150px] h-9 border-0 bg-muted/50">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Keys</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            {filteredKeys.length} keys
          </div>
        </div>

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
        ) : filteredKeys.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No keys match the current filter.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredKeys.map((key) => (
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
