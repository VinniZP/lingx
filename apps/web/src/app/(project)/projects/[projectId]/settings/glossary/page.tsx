'use client';

import { use, useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  Tag,
  Languages,
  Hash,
  BarChart3,
  Globe,
  FileText,
  FileCode,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectApi } from '@/lib/api';
import type { PartOfSpeech, GlossaryEntry, GlossaryTag, GlossarySyncStatus, MTProvider } from '@/lib/api';
import {
  useGlossaryList,
  useGlossaryStats,
  useGlossaryTags,
  useCreateGlossaryEntry,
  useUpdateGlossaryEntry,
  useDeleteGlossaryEntry,
  useCreateGlossaryTag,
  useDeleteGlossaryTag,
  useGlossaryImport,
  useGlossaryExport,
  useGlossarySync,
  useGlossarySyncStatus,
  useDeleteGlossarySync,
} from '@/hooks';

// Form schemas
const entryFormSchema = z.object({
  sourceTerm: z.string().min(1, 'Source term is required'),
  sourceLanguage: z.string().min(1, 'Source language is required'),
  context: z.string().optional(),
  notes: z.string().optional(),
  partOfSpeech: z.string().optional(),
  caseSensitive: z.boolean(),
  domain: z.string().optional(),
  tagIds: z.array(z.string()),
  translations: z.array(z.object({
    targetLanguage: z.string(),
    targetTerm: z.string(),
    notes: z.string().optional(),
  })),
});

type EntryFormData = z.infer<typeof entryFormSchema>;

const tagFormSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.string().optional(),
});

type TagFormData = z.infer<typeof tagFormSchema>;

// Part of speech options
const PART_OF_SPEECH_OPTIONS: { value: PartOfSpeech; label: string }[] = [
  { value: 'NOUN', label: 'Noun' },
  { value: 'VERB', label: 'Verb' },
  { value: 'ADJECTIVE', label: 'Adjective' },
  { value: 'ADVERB', label: 'Adverb' },
  { value: 'PRONOUN', label: 'Pronoun' },
  { value: 'PREPOSITION', label: 'Preposition' },
  { value: 'CONJUNCTION', label: 'Conjunction' },
  { value: 'INTERJECTION', label: 'Interjection' },
  { value: 'DETERMINER', label: 'Determiner' },
  { value: 'OTHER', label: 'Other' },
];

// Tag colors - refined palette
const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
];

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function GlossarySettingsPage({ params }: PageProps) {
  const { projectId } = use(params);

  // State
  const [search, setSearch] = useState('');
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<GlossaryEntry | null>(null);
  const [deletingTag, setDeletingTag] = useState<GlossaryTag | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const listParams = useMemo(() => ({
    search: search || undefined,
    sourceLanguage: sourceLanguageFilter !== 'all' ? sourceLanguageFilter : undefined,
    domain: domainFilter !== 'all' ? domainFilter : undefined,
    tagId: tagFilter !== 'all' ? tagFilter : undefined,
    page,
    limit: 20,
  }), [search, sourceLanguageFilter, domainFilter, tagFilter, page]);

  const { data: entriesData, isLoading: isLoadingEntries } = useGlossaryList(projectId, listParams);
  const { data: statsData } = useGlossaryStats(projectId);
  const { data: tagsData } = useGlossaryTags(projectId);
  const { data: syncStatusData } = useGlossarySyncStatus(projectId);

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

  const languages = project?.languages || [];
  const entries = entriesData?.entries || [];
  const total = entriesData?.total || 0;
  const stats = statsData;
  const tags = tagsData?.tags || [];
  const syncStatuses = syncStatusData?.syncs || [];

  // Get unique domains from stats
  const domains = useMemo(() =>
    stats?.topDomains?.map(d => d.domain) || [],
    [stats]
  );

  // Entry form
  const entryForm = useForm<EntryFormData>({
    resolver: zodResolver(entryFormSchema),
    mode: 'onTouched',
    defaultValues: {
      sourceTerm: '',
      sourceLanguage: languages.find(l => l.isDefault)?.code || '',
      context: '',
      notes: '',
      partOfSpeech: '__none__',
      caseSensitive: false,
      domain: '',
      tagIds: [],
      translations: [],
    },
  });

  // Tag form
  const tagForm = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    mode: 'onTouched',
    defaultValues: { name: '', color: TAG_COLORS[0] },
  });

  // Reset entry form when dialog opens/closes
  const openEntryDialog = useCallback((entry?: GlossaryEntry) => {
    if (entry) {
      setEditingEntry(entry);
      entryForm.reset({
        sourceTerm: entry.sourceTerm,
        sourceLanguage: entry.sourceLanguage,
        context: entry.context || '',
        notes: entry.notes || '',
        partOfSpeech: entry.partOfSpeech || '__none__',
        caseSensitive: entry.caseSensitive,
        domain: entry.domain || '',
        tagIds: entry.tags.map(t => t.id),
        translations: entry.translations.map(t => ({
          targetLanguage: t.targetLanguage,
          targetTerm: t.targetTerm,
          notes: t.notes || '',
        })),
      });
    } else {
      setEditingEntry(null);
      entryForm.reset({
        sourceTerm: '',
        sourceLanguage: languages.find(l => l.isDefault)?.code || '',
        context: '',
        notes: '',
        partOfSpeech: '__none__',
        caseSensitive: false,
        domain: '',
        tagIds: [],
        translations: [],
      });
    }
    setIsEntryDialogOpen(true);
  }, [entryForm, languages]);

  const handleEntrySubmit = async (data: EntryFormData) => {
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
        toast.success('Entry updated');
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
        toast.success('Entry created');
      }
      setIsEntryDialogOpen(false);
    } catch {
      toast.error('Failed to save entry');
    }
  };

  const handleDeleteEntry = async () => {
    if (!deletingEntry) return;
    try {
      await deleteEntry.mutateAsync(deletingEntry.id);
      toast.success('Entry deleted');
      setDeletingEntry(null);
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  const handleTagSubmit = async (data: TagFormData) => {
    try {
      await createTag.mutateAsync(data);
      toast.success('Tag created');
      setIsTagDialogOpen(false);
      tagForm.reset();
    } catch {
      toast.error('Failed to create tag');
    }
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;
    try {
      await deleteTag.mutateAsync(deletingTag.id);
      toast.success('Tag deleted');
      setDeletingTag(null);
    } catch {
      toast.error('Failed to delete tag');
    }
  };

  // Import/Export handlers
  const [importFormat, setImportFormat] = useState<'csv' | 'tbx'>('csv');
  const [importOverwrite, setImportOverwrite] = useState(false);

  const handleImport = async (file: File) => {
    try {
      await importGlossary.mutateAsync({
        file,
        format: importFormat,
        overwrite: importOverwrite,
      });
      toast.success('Glossary imported successfully');
      setIsImportDialogOpen(false);
    } catch {
      toast.error('Failed to import glossary');
    }
  };

  const handleExport = async (format: 'csv' | 'tbx') => {
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
      toast.success('Glossary exported');
    } catch {
      toast.error('Failed to export glossary');
    }
  };

  // Sync handlers
  const handleSync = async (provider: MTProvider, srcLang: string, tgtLang: string) => {
    try {
      await syncGlossary.mutateAsync({
        provider,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
      });
      toast.success(`Glossary synced to ${provider === 'DEEPL' ? 'DeepL' : 'Google Translate'}`);
    } catch {
      toast.error('Failed to sync glossary');
    }
  };

  const handleDeleteSync = async (provider: MTProvider, srcLang: string, tgtLang: string) => {
    try {
      await deleteSyncGlossary.mutateAsync({
        provider,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
      });
      toast.success('Synced glossary deleted from provider');
    } catch {
      toast.error('Failed to delete synced glossary');
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-10">
      {/* Statistics Section */}
      <section className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/10 flex items-center justify-center shadow-sm">
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
            <p className="text-sm text-muted-foreground">Glossary statistics and insights</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {/* Total Terms */}
          <div className="island p-6 relative overflow-hidden group">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="size-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center">
                  <BookOpen className="size-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-xs text-success">
                  <TrendingUp className="size-3" />
                  <span className="font-medium">Active</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Terms
                </p>
                <div className="text-4xl font-bold tracking-tight tabular-nums">
                  {stats?.totalEntries ?? 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats?.totalTranslations ?? 0} translations across languages
                </p>
              </div>
            </div>
          </div>

          {/* Language Pairs */}
          <div className="island p-6 relative overflow-hidden group animate-fade-in-up stagger-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="size-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/10 flex items-center justify-center">
                  <Languages className="size-5 text-blue-500" />
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-500">
                  <Globe className="size-3" />
                  <span className="font-medium">Pairs</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Language Pairs
                </p>
                <div className="text-4xl font-bold tracking-tight tabular-nums">
                  {stats?.languagePairs?.length ?? 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Active translation combinations
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="island p-6 relative overflow-hidden group animate-fade-in-up stagger-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full" />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="size-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/10 flex items-center justify-center">
                  <Tag className="size-5 text-amber-500" />
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Hash className="size-3" />
                  <span className="font-medium">Categories</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Tags Defined
                </p>
                <div className="text-4xl font-bold tracking-tight tabular-nums">
                  {tags.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Organizational categories
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Entries Section */}
      <section className="space-y-6 animate-fade-in-up stagger-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/10 flex items-center justify-center shadow-sm">
              <BookOpen className="size-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Terminology</h2>
              <p className="text-sm text-muted-foreground">Manage your glossary entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <Download className="size-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="size-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('tbx')}>
                  <FileText className="size-4 mr-2" />
                  Export as TBX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button size="sm" className="h-9 gap-2" onClick={() => openEntryDialog()}>
              <Plus className="size-4" />
              Add Term
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search terms..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 h-11 bg-card border-border/50"
            />
          </div>

          <Select value={sourceLanguageFilter} onValueChange={(v) => { setSourceLanguageFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-10 bg-card border-border/50">
              <Globe className="size-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {domains.length > 0 && (
            <Select value={domainFilter} onValueChange={(v) => { setDomainFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px] h-10 bg-card border-border/50">
                <Hash className="size-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tags.length > 0 && (
            <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px] h-10 bg-card border-border/50">
                <Tag className="size-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      {tag.color && (
                        <div
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">
              {total} {total === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>

        {/* Entry List */}
        <div className="island overflow-hidden">
          {isLoadingEntries ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Loading entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-20 text-center">
              <div className="relative inline-flex mb-6">
                <div className="size-20 rounded-3xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center">
                  <BookOpen className="size-8 text-muted-foreground/60" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-8 rounded-xl bg-primary/10 border-2 border-background flex items-center justify-center">
                  <Plus className="size-4 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {search || sourceLanguageFilter !== 'all' || domainFilter !== 'all' || tagFilter !== 'all'
                  ? 'No matching entries'
                  : 'Start building your glossary'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                {search || sourceLanguageFilter !== 'all' || domainFilter !== 'all' || tagFilter !== 'all'
                  ? 'Try adjusting your filters to find what you\'re looking for'
                  : 'Add terminology to ensure consistent translations across your project'}
              </p>
              {!search && sourceLanguageFilter === 'all' && domainFilter === 'all' && tagFilter === 'all' && (
                <Button onClick={() => openEntryDialog()} className="gap-2">
                  <Plus className="size-4" />
                  Add First Term
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="px-6 py-5 hover:bg-muted/30 transition-colors group"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="font-mono font-semibold text-base">
                            {entry.sourceTerm}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
                            {entry.sourceLanguage}
                          </Badge>
                          {entry.caseSensitive && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                              Aa
                            </Badge>
                          )}
                          {entry.partOfSpeech && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">
                              {entry.partOfSpeech.toLowerCase()}
                            </Badge>
                          )}
                        </div>

                        {/* Translations */}
                        {entry.translations.length > 0 && (
                          <div className="flex items-center gap-3 text-sm mb-3">
                            <ChevronRight className="size-3.5 text-muted-foreground/50" />
                            <div className="flex items-center gap-4 flex-wrap">
                              {entry.translations.slice(0, 3).map((t) => (
                                <span key={t.id} className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground/70 font-medium uppercase">{t.targetLanguage}</span>
                                  <span className="font-medium">{t.targetTerm}</span>
                                </span>
                              ))}
                              {entry.translations.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{entry.translations.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tags and metadata */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.domain && (
                            <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                              <Hash className="size-2.5" />
                              {entry.domain}
                            </Badge>
                          )}
                          {entry.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="text-[10px] gap-1 font-medium"
                              style={tag.color ? {
                                backgroundColor: `${tag.color}12`,
                                borderColor: `${tag.color}25`,
                                color: tag.color,
                              } : undefined}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {entry.context && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-[240px]">
                              &ldquo;{entry.context}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEntryDialog(entry)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeletingEntry(entry)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Tags Section */}
      <section className="space-y-6 animate-fade-in-up stagger-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/10 flex items-center justify-center shadow-sm">
              <Tag className="size-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Tags</h2>
              <p className="text-sm text-muted-foreground">Organize terms by category</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-9 gap-2" onClick={() => { tagForm.reset(); setIsTagDialogOpen(true); }}>
            <Plus className="size-4" />
            Add Tag
          </Button>
        </div>

        <div className="island p-6">
          {tags.length === 0 ? (
            <div className="text-center py-10">
              <div className="relative inline-flex mb-5">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent flex items-center justify-center">
                  <Tag className="size-7 text-amber-500/60" />
                </div>
              </div>
              <h3 className="text-base font-semibold mb-1.5">No tags yet</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Create tags to categorize and organize your terminology
              </p>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => { tagForm.reset(); setIsTagDialogOpen(true); }}>
                <Plus className="size-4" />
                Create First Tag
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={cn(
                    "inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border",
                    "bg-card hover:bg-muted/50 transition-all duration-200 group cursor-default"
                  )}
                  style={tag.color ? {
                    borderColor: `${tag.color}30`,
                  } : undefined}
                >
                  {tag.color && (
                    <div
                      className="size-3 rounded-full shadow-sm"
                      style={{ backgroundColor: tag.color, boxShadow: `0 0 0 2px var(--card), 0 0 0 4px ${tag.color}40` }}
                    />
                  )}
                  <span className="text-sm font-medium">{tag.name}</span>
                  <button
                    onClick={() => setDeletingTag(tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MT Provider Sync Section */}
      <section className="space-y-6 animate-fade-in-up stagger-5">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent border border-blue-500/10 flex items-center justify-center shadow-sm">
            <RefreshCw className="size-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Provider Sync</h2>
            <p className="text-sm text-muted-foreground">Sync glossary to translation providers</p>
          </div>
        </div>

        <div className="island p-6 space-y-5">
          {/* Info banner */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border border-primary/10">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Terminology Consistency</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sync your glossary to machine translation providers to ensure consistent terminology.
                Your terms will be applied automatically during translations.
              </p>
            </div>
          </div>

          {/* Sync Status */}
          {syncStatuses.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Syncs
                </h4>
                <Badge variant="secondary" className="text-[10px]">
                  {syncStatuses.length} connected
                </Badge>
              </div>
              <div className="divide-y divide-border/50 rounded-xl border border-border/50 overflow-hidden">
                {syncStatuses.map((sync: GlossarySyncStatus) => (
                  <div key={`${sync.provider}-${sync.sourceLanguage}-${sync.targetLanguage}`} className="px-5 py-4 flex items-center justify-between bg-card/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "size-10 rounded-xl flex items-center justify-center",
                        sync.provider === 'DEEPL' ? "bg-[#0F2B46]/10" : "bg-emerald-500/10"
                      )}>
                        <Languages className={cn(
                          "size-5",
                          sync.provider === 'DEEPL' ? "text-[#0F2B46] dark:text-blue-400" : "text-emerald-500"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold">
                            {sync.provider === 'DEEPL' ? 'DeepL' : 'Google Translate'}
                          </span>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold",
                            sync.syncStatus === 'synced'
                              ? "bg-success/15 text-success"
                              : sync.syncStatus === 'error'
                              ? "bg-destructive/15 text-destructive"
                              : "bg-amber-500/15 text-amber-600"
                          )}>
                            {sync.syncStatus === 'synced' && <Check className="size-3" />}
                            {sync.syncStatus === 'error' && <AlertCircle className="size-3" />}
                            {sync.syncStatus === 'pending' && <Loader2 className="size-3 animate-spin" />}
                            {sync.syncStatus}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sync.sourceLanguage} → {sync.targetLanguage} · {sync.entriesCount} terms synced
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSync(sync.provider, sync.sourceLanguage, sync.targetLanguage)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Zap className="size-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium mb-1">No syncs configured</p>
              <p className="text-sm text-muted-foreground">
                Connect your glossary to a provider below
              </p>
            </div>
          )}

          {/* Quick Sync Actions */}
          {stats && stats.languagePairs.length > 0 && (
            <div className="pt-5 border-t border-border/50">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Quick Sync
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {stats.languagePairs.slice(0, 4).map((pair) => (
                  <DropdownMenu key={`${pair.sourceLanguage}-${pair.targetLanguage}`}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2 pl-3 pr-2">
                        <span className="font-mono text-xs">{pair.sourceLanguage}</span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                        <span className="font-mono text-xs">{pair.targetLanguage}</span>
                        <Badge variant="secondary" className="text-[10px] ml-1 tabular-nums">
                          {pair.count}
                        </Badge>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => handleSync('DEEPL', pair.sourceLanguage, pair.targetLanguage)}
                        disabled={syncGlossary.isPending}
                      >
                        <Languages className="size-4 mr-2 text-[#0F2B46] dark:text-blue-400" />
                        Sync to DeepL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSync('GOOGLE_TRANSLATE', pair.sourceLanguage, pair.targetLanguage)}
                        disabled={syncGlossary.isPending}
                      >
                        <Languages className="size-4 mr-2 text-emerald-500" />
                        Sync to Google
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Entry Dialog - Premium Design */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Premium Header with Gradient */}
          <div className="relative px-7 pt-7 pb-5 border-b border-border/40 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/[0.06] to-transparent rounded-bl-full" />

            <div className="relative flex items-start gap-4">
              <div className={cn(
                "size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                editingEntry
                  ? "bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/20"
                  : "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20"
              )}>
                {editingEntry ? (
                  <Pencil className="size-5 text-amber-500" />
                ) : (
                  <BookOpen className="size-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {editingEntry ? 'Edit Term' : 'Add New Term'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {editingEntry
                    ? 'Update the glossary entry details and translations'
                    : 'Add a new term to your project glossary for consistent translations'}
                </DialogDescription>
              </div>
            </div>
          </div>

          <Form {...entryForm}>
            <form onSubmit={entryForm.handleSubmit(handleEntrySubmit)} className="px-7 py-6 space-y-6">
              {/* Primary Fields Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="size-1.5 rounded-full bg-primary" />
                  Term Information
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={entryForm.control}
                    name="sourceTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Source Term</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. API, Dashboard, Settings"
                            className="h-11 bg-muted/30 border-border/60 focus:bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={entryForm.control}
                    name="sourceLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Source Language</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!!editingEntry}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 bg-muted/30 border-border/60">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {lang.code}
                                  </span>
                                  {lang.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Classification Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="size-1.5 rounded-full bg-amber-500" />
                  Classification
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={entryForm.control}
                    name="partOfSpeech"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Part of Speech</FormLabel>
                        <Select value={field.value || '__none__'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-muted/30 border-border/60">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">None specified</span>
                            </SelectItem>
                            {PART_OF_SPEECH_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={entryForm.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Domain</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                            <Input
                              placeholder="e.g. technical, legal, medical"
                              className="h-11 pl-10 bg-muted/30 border-border/60 focus:bg-background"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Context & Notes Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="size-1.5 rounded-full bg-blue-500" />
                  Additional Details
                </div>

                <FormField
                  control={entryForm.control}
                  name="context"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Usage Context</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide an example sentence or describe where this term is used..."
                          className="resize-none min-h-[80px] bg-muted/30 border-border/60 focus:bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={entryForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Translator Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add guidance or special instructions for translators..."
                          className="resize-none min-h-[80px] bg-muted/30 border-border/60 focus:bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Settings Section */}
              <FormField
                control={entryForm.control}
                name="caseSensitive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-muted/60 flex items-center justify-center">
                        <span className="text-sm font-semibold text-muted-foreground">Aa</span>
                      </div>
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium cursor-pointer">Case Sensitive Matching</FormLabel>
                        <FormDescription className="text-xs">
                          Require exact letter casing when matching this term
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Tags Section */}
              {tags.length > 0 && (
                <FormField
                  control={entryForm.control}
                  name="tagIds"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-3">
                        <FormLabel className="text-sm font-medium">Tags</FormLabel>
                        <span className="text-xs text-muted-foreground">
                          {field.value.length} selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const isSelected = field.value.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  field.onChange(field.value.filter(id => id !== tag.id));
                                } else {
                                  field.onChange([...field.value, tag.id]);
                                }
                              }}
                              className={cn(
                                "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                                isSelected
                                  ? "bg-primary/15 text-primary border-2 border-primary/30 shadow-sm"
                                  : "bg-muted/40 text-muted-foreground border-2 border-transparent hover:bg-muted/60 hover:text-foreground"
                              )}
                            >
                              {tag.color && (
                                <div
                                  className="size-3 rounded-full shadow-sm"
                                  style={{
                                    backgroundColor: tag.color,
                                    boxShadow: isSelected ? `0 0 0 2px var(--background), 0 0 0 3px ${tag.color}50` : undefined
                                  }}
                                />
                              )}
                              {tag.name}
                              {isSelected && <Check className="size-3.5 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>

          {/* Premium Footer */}
          <div className="px-7 py-5 border-t border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {editingEntry ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Changes will apply to all translations
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-3.5" />
                  Term will be available for matching
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-10 px-4"
                onClick={() => setIsEntryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={entryForm.handleSubmit(handleEntrySubmit)}
                disabled={createEntry.isPending || updateEntry.isPending}
                className="h-10 px-5 gap-2"
              >
                {(createEntry.isPending || updateEntry.isPending) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editingEntry ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editingEntry ? 'Save Changes' : 'Add Term'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
            <DialogDescription>
              Add a new tag to organize your glossary
            </DialogDescription>
          </DialogHeader>

          <Form {...tagForm}>
            <form onSubmit={tagForm.handleSubmit(handleTagSubmit)} className="space-y-5">
              <FormField
                control={tagForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Technical, Legal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tagForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={cn(
                            "size-9 rounded-xl transition-all duration-200",
                            field.value === color
                              ? "scale-110"
                              : "hover:scale-110"
                          )}
                          style={{
                            backgroundColor: color,
                            boxShadow: field.value === color ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : undefined
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTag.isPending}>
                  {createTag.isPending && <Loader2 className="size-4 animate-spin mr-1.5" />}
                  Create Tag
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog - Premium Design */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
          {/* Premium Header */}
          <div className="relative px-7 pt-7 pb-5 border-b border-border/40 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-emerald-500/[0.03] to-transparent rounded-tr-full" />

            <div className="relative flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <Upload className="size-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Import Glossary
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Import terminology from industry-standard file formats
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-7 py-6 space-y-5">
            {/* Format Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                File Format
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportFormat('csv')}
                  className={cn(
                    "relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    importFormat === 'csv'
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/60 hover:border-border hover:bg-muted/30"
                  )}
                >
                  {importFormat === 'csv' && (
                    <div className="absolute top-3 right-3 size-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="size-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center",
                    importFormat === 'csv'
                      ? "bg-emerald-500/15"
                      : "bg-muted/60"
                  )}>
                    <FileText className={cn(
                      "size-5",
                      importFormat === 'csv' ? "text-emerald-500" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <div className={cn(
                      "font-semibold text-sm",
                      importFormat === 'csv' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    )}>
                      CSV
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Comma-separated values
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportFormat('tbx')}
                  className={cn(
                    "relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    importFormat === 'tbx'
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/60 hover:border-border hover:bg-muted/30"
                  )}
                >
                  {importFormat === 'tbx' && (
                    <div className="absolute top-3 right-3 size-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="size-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center",
                    importFormat === 'tbx'
                      ? "bg-emerald-500/15"
                      : "bg-muted/60"
                  )}>
                    <FileCode className={cn(
                      "size-5",
                      importFormat === 'tbx' ? "text-emerald-500" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <div className={cn(
                      "font-semibold text-sm",
                      importFormat === 'tbx' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    )}>
                      TBX
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      TermBase eXchange (ISO)
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="size-1.5 rounded-full bg-amber-500" />
                Import Options
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <RefreshCw className="size-4 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium cursor-pointer">Overwrite Existing Terms</label>
                    <p className="text-xs text-muted-foreground">
                      Update terms that already exist in your glossary
                    </p>
                  </div>
                </div>
                <Switch checked={importOverwrite} onCheckedChange={setImportOverwrite} />
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className={cn(
                "relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
                "border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]",
                "cursor-pointer group"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="size-14 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mx-auto mb-4 group-hover:from-emerald-500/15 group-hover:to-emerald-500/5 transition-colors">
                <Upload className="size-6 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </div>
              <p className="text-sm font-medium mb-1">
                Click to select file
              </p>
              <p className="text-xs text-muted-foreground">
                or drag and drop your {importFormat === 'csv' ? '.csv' : '.tbx'} file here
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={importFormat === 'csv' ? '.csv' : '.tbx'}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
          </div>

          {/* Premium Footer */}
          <div className="px-7 py-5 border-t border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="size-3.5" />
              Accepts {importFormat === 'csv' ? 'CSV' : 'TBX'} files
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-10 px-4"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importGlossary.isPending}
                className="h-10 px-5 gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {importGlossary.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Select File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingEntry?.sourceTerm}&rdquo; and all its translations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEntry.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tag Confirmation */}
      <AlertDialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag &ldquo;{deletingTag?.name}&rdquo; from all entries.
              The entries themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTag.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
