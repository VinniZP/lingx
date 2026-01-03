'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Check,
  X,
  Sparkles,
  Wand2,
  BookOpen,
  History,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Type,
  Percent,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Brain,
  FileCode,
  Link2,
  Loader2,
  Edit3,
  Trash2,
  GitBranch,
  BarChart3,
  Plus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  mockKeys,
  languages,
  getTranslation,
  getQualityBgColor,
  getStatusColor,
  getNamespaces,
  getQualityDimensions,
  getQualityIssues,
  getAISuggestion,
  getRelatedKeys,
  getTmMatchesForLanguage,
  getGlossaryForLanguage,
  getKeyHealth,
  countPlaceholders,
  type TranslationKey,
  type Translation,
  type QualityDimensions,
  type QualityIssue,
  type AISuggestion,
  type RelatedKey,
} from '../_shared/mock-data';
import { IcuBuilder } from '../_shared/icu-builder';

// ===== Types =====
type StatusFilter = 'all' | 'translated' | 'untranslated' | 'approved' | 'rejected' | 'pending';
type QualityFilter = 'all' | 'excellent' | 'good' | 'fair' | 'poor' | 'unscored';

// ===== Sub-components =====

// Quality Meter Component (5 segments)
function QualityMeter({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const segments = [20, 40, 60, 80, 95];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5 h-1.5 w-14">
        {segments.map((threshold, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-sm transition-all duration-200',
              score >= threshold
                ? i < 2 ? 'bg-destructive' : i < 4 ? 'bg-warning' : 'bg-success'
                : 'bg-muted'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn(
          'text-xs font-medium tabular-nums',
          score >= 90 ? 'text-success' :
          score >= 70 ? 'text-warning' :
          score > 0 ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {score > 0 ? `${score}%` : '—'}
        </span>
      )}
    </div>
  );
}

// Quality Dimension Tooltip
function QualityDimensionTooltip({ dimensions, score }: { dimensions?: QualityDimensions; score?: number }) {
  if (!dimensions) return null;

  const items = [
    { label: 'Accuracy', value: dimensions.accuracy, weight: '40%' },
    { label: 'Fluency', value: dimensions.fluency, weight: '25%' },
    { label: 'Terminology', value: dimensions.terminology, weight: '15%' },
    { label: 'Format', value: dimensions.format, weight: '20%' },
  ];

  return (
    <div className="space-y-2 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <span className="text-xs text-muted-foreground">Quality Score</span>
        <span className={cn(
          'text-lg font-bold tabular-nums',
          (score || 0) >= 90 ? 'text-success' :
          (score || 0) >= 70 ? 'text-warning' : 'text-destructive'
        )}>
          {score || 0}%
        </span>
      </div>
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-20">{item.label}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                item.value >= 90 ? 'bg-success' :
                item.value >= 70 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${item.value}%` }}
            />
          </div>
          <span className="text-xs tabular-nums w-8">{item.value}%</span>
        </div>
      ))}
    </div>
  );
}

// Quality Issues Inline
function QualityIssuesInline({ issues }: { issues: QualityIssue[] }) {
  if (issues.length === 0) return null;

  const severityIcon = {
    error: <AlertCircle className="size-3" />,
    warning: <AlertTriangle className="size-3" />,
    info: <Info className="size-3" />,
  };

  const severityColor = {
    error: 'text-destructive bg-destructive/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-info bg-info/10',
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {issues.map(issue => (
        <Tooltip key={issue.id}>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
              severityColor[issue.severity]
            )}>
              {severityIcon[issue.severity]}
              <span className="truncate max-w-32">{issue.message}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{issue.message}</p>
            {issue.context && (
              <p className="text-xs text-muted-foreground mt-1">Context: {issue.context}</p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

// AI Loading Skeleton
function AILoadingSkeleton() {
  return (
    <div className="mt-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-4 text-primary animate-pulse" />
        <span className="text-xs text-primary font-medium">
          AI is thinking
          <span className="inline-flex ml-0.5">
            <span className="animate-[blink_1.4s_infinite] opacity-20">.</span>
            <span className="animate-[blink_1.4s_infinite_0.2s] opacity-20">.</span>
            <span className="animate-[blink_1.4s_infinite_0.4s] opacity-20">.</span>
          </span>
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted rounded bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]" />
        <div className="h-4 w-3/4 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted rounded bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

// AI Suggestion Display
function AISuggestionDisplay({
  suggestion,
  onApply,
  isRevealing,
}: {
  suggestion: AISuggestion;
  onApply: (text: string) => void;
  isRevealing: boolean;
}) {
  const confidenceColor = {
    high: 'bg-success/15 text-success border-success/30',
    medium: 'bg-warning/15 text-warning border-warning/30',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className={cn(
      'mt-3 p-3 rounded-lg border border-primary/20 bg-primary/5 transition-all duration-300',
      isRevealing && 'animate-[fadeSlideIn_300ms_ease-out]'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-xs font-medium text-primary">AI Suggestion</span>
          <Badge variant="outline" className={cn('text-[10px]', confidenceColor[suggestion.confidence])}>
            {suggestion.confidence} confidence
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {suggestion.provider} · {suggestion.model}
        </span>
      </div>

      {/* Best suggestion */}
      <div
        className="p-2 bg-card rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => onApply(suggestion.text)}
      >
        <p className="text-sm font-mono">{suggestion.text}</p>
      </div>

      {/* Alternatives */}
      {suggestion.alternatives.length > 0 && (
        <div className="mt-2 space-y-1">
          <span className="text-[10px] text-muted-foreground">Alternatives:</span>
          {suggestion.alternatives.map((alt, i) => (
            <div
              key={i}
              className="p-2 bg-muted/30 rounded text-xs font-mono text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onApply(alt)}
            >
              {alt}
            </div>
          ))}
        </div>
      )}

      {/* Context info */}
      {suggestion.context && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          {suggestion.context.glossaryTermsUsed > 0 && (
            <span>✓ Uses {suggestion.context.glossaryTermsUsed} glossary terms</span>
          )}
          {suggestion.context.relatedKeysReferenced > 0 && (
            <span>✓ Referenced {suggestion.context.relatedKeysReferenced} related keys</span>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Main Component =====
export default function WorkbenchProPage() {
  // State
  const [selectedKeyId, setSelectedKeyId] = useState<string>(mockKeys[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [activeBottomTab, setActiveBottomTab] = useState('tm');
  const [bottomDockHeight, setBottomDockHeight] = useState(220);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [aiLoadingLangs, setAiLoadingLangs] = useState<Set<string>>(new Set());
  const [aiRevealedLangs, setAiRevealedLangs] = useState<Set<string>>(new Set());
  const [savingLangs, setSavingLangs] = useState<Set<string>>(new Set());
  const [savedLangs, setSavedLangs] = useState<Set<string>>(new Set());

  const namespaces = getNamespaces(mockKeys);
  const targetLanguages = languages.filter(l => !l.isSource);

  // Get current key
  const currentKey = mockKeys.find(k => k.id === selectedKeyId) || mockKeys[0];
  const sourceTranslation = getTranslation(currentKey, 'en');
  const keyHealth = getKeyHealth(currentKey);

  // Filter keys
  const filteredKeys = mockKeys.filter(key => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!key.name.toLowerCase().includes(q) &&
          !key.description?.toLowerCase().includes(q) &&
          !getTranslation(key, 'en')?.value.toLowerCase().includes(q)) {
        return false;
      }
    }
    // Namespace
    if (namespaceFilter !== 'all' && key.namespace !== namespaceFilter) return false;

    // Status & Quality filters apply to any language
    if (statusFilter !== 'all' || qualityFilter !== 'all') {
      const hasMatchingLang = targetLanguages.some(lang => {
        const t = getTranslation(key, lang.code);

        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'translated' && (!t || !t.value)) return false;
          if (statusFilter === 'untranslated' && t?.value) return false;
          if (statusFilter === 'approved' && t?.status !== 'approved') return false;
          if (statusFilter === 'rejected' && t?.status !== 'rejected') return false;
          if (statusFilter === 'pending' && t?.status !== 'pending') return false;
        }

        // Quality filter
        if (qualityFilter !== 'all') {
          const score = t?.qualityScore || 0;
          if (qualityFilter === 'excellent' && score < 90) return false;
          if (qualityFilter === 'good' && (score < 70 || score >= 90)) return false;
          if (qualityFilter === 'fair' && (score < 50 || score >= 70)) return false;
          if (qualityFilter === 'poor' && score >= 50) return false;
          if (qualityFilter === 'unscored' && score > 0) return false;
        }

        return true;
      });
      if (!hasMatchingLang) return false;
    }

    return true;
  });

  // Smart expand logic
  useEffect(() => {
    const expanded = new Set<string>();
    targetLanguages.forEach(lang => {
      const t = getTranslation(currentKey, lang.code);
      // Expand if empty, pending, or rejected
      if (!t?.value || t.status === 'pending' || t.status === 'rejected') {
        expanded.add(lang.code);
      }
    });
    setExpandedLanguages(expanded);
    setDescription(currentKey.description || '');
  }, [selectedKeyId]);

  // Get translation value
  const getValue = useCallback((key: TranslationKey, langCode: string) => {
    if (translations[key.id]?.[langCode] !== undefined) {
      return translations[key.id][langCode];
    }
    const t = getTranslation(key, langCode);
    return t?.value || '';
  }, [translations]);

  // Toggle language expansion
  const toggleLanguage = (langCode: string) => {
    setExpandedLanguages(prev => {
      const next = new Set(prev);
      if (next.has(langCode)) {
        next.delete(langCode);
      } else {
        next.add(langCode);
      }
      return next;
    });
  };

  // Save translation
  const saveTranslation = (langCode: string, value: string) => {
    setSavingLangs(prev => new Set(prev).add(langCode));

    setTimeout(() => {
      setTranslations(prev => ({
        ...prev,
        [currentKey.id]: {
          ...prev[currentKey.id],
          [langCode]: value,
        },
      }));
      setSavingLangs(prev => {
        const next = new Set(prev);
        next.delete(langCode);
        return next;
      });
      setSavedLangs(prev => new Set(prev).add(langCode));
      setTimeout(() => {
        setSavedLangs(prev => {
          const next = new Set(prev);
          next.delete(langCode);
          return next;
        });
      }, 2000);
    }, 500);
  };

  // Simulate AI translation
  const fetchAI = (langCode: string) => {
    setAiLoadingLangs(prev => new Set(prev).add(langCode));
    setAiRevealedLangs(prev => {
      const next = new Set(prev);
      next.delete(langCode);
      return next;
    });

    setTimeout(() => {
      setAiLoadingLangs(prev => {
        const next = new Set(prev);
        next.delete(langCode);
        return next;
      });
      setAiRevealedLangs(prev => new Set(prev).add(langCode));
    }, 2000);
  };

  // Apply suggestion
  const applySuggestion = (langCode: string, text: string) => {
    setTranslations(prev => ({
      ...prev,
      [currentKey.id]: {
        ...prev[currentKey.id],
        [langCode]: text,
      },
    }));
  };

  // Batch actions
  const translateAllEmpty = () => {
    targetLanguages.forEach(lang => {
      const t = getTranslation(currentKey, lang.code);
      if (!t?.value) {
        fetchAI(lang.code);
      }
    });
  };

  // Key selection
  const toggleKeySelection = (keyId: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const selectAllKeys = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map(k => k.id)));
    }
  };

  // Get TM matches and glossary for current selection
  const relatedKeys = getRelatedKeys(currentKey.id);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* ===== Toolbar ===== */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            {/* Branch stats */}
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <GitBranch className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">main</span>
              <Badge variant="outline" className="text-xs">
                <BarChart3 className="size-3 mr-1" />
                87%
              </Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-9 pl-9 transition-all focus:w-80"
              />
            </div>

            {/* Filters */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px] h-9">
                <Filter className="size-3.5 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="translated">Translated</SelectItem>
                <SelectItem value="untranslated">Untranslated</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={qualityFilter} onValueChange={(v) => setQualityFilter(v as QualityFilter)}>
              <SelectTrigger className="w-[140px] h-9">
                <BarChart3 className="size-3.5 mr-2" />
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All quality</SelectItem>
                <SelectItem value="excellent">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" />
                    Excellent (90+)
                  </span>
                </SelectItem>
                <SelectItem value="good">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-warning" />
                    Good (70-89)
                  </span>
                </SelectItem>
                <SelectItem value="fair">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-warning" />
                    Fair (50-69)
                  </span>
                </SelectItem>
                <SelectItem value="poor">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-destructive" />
                    Poor (&lt;50)
                  </span>
                </SelectItem>
                <SelectItem value="unscored">Unscored</SelectItem>
              </SelectContent>
            </Select>

            <Select value={namespaceFilter} onValueChange={setNamespaceFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Namespace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All namespaces</SelectItem>
                {namespaces.map(ns => (
                  <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Plus className="size-4 mr-1.5" />
              Create Key
            </Button>
          </div>
        </div>

        {/* ===== Main Content ===== */}
        <div className="flex-1 flex overflow-hidden">
          {/* ===== Key List Sidebar ===== */}
          <div className="w-72 border-r border-border bg-card flex flex-col">
            {/* List header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedKeys.size === filteredKeys.length && filteredKeys.length > 0}
                  onCheckedChange={selectAllKeys}
                />
                <span className="text-xs text-muted-foreground">
                  {filteredKeys.length} keys
                </span>
              </div>
              {selectedKeys.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedKeys.size} selected
                </Badge>
              )}
            </div>

            {/* Key list */}
            <div className="flex-1 overflow-auto">
              {filteredKeys.map((key) => {
                const health = getKeyHealth(key);
                const isSelected = key.id === selectedKeyId;
                const isChecked = selectedKeys.has(key.id);

                return (
                  <div
                    key={key.id}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2.5 border-b border-border cursor-pointer transition-all',
                      isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                    )}
                    onClick={() => setSelectedKeyId(key.id)}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleKeySelection(key.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {/* Status dots for each language */}
                        <div className="flex gap-0.5">
                          {targetLanguages.map(lang => {
                            const t = getTranslation(key, lang.code);
                            return (
                              <Tooltip key={lang.code}>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    'size-1.5 rounded-full',
                                    !t?.value ? 'bg-muted-foreground/40' :
                                    t.status === 'approved' ? 'bg-success' :
                                    t.status === 'rejected' ? 'bg-destructive' : 'bg-warning'
                                  )} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {lang.flag} {lang.name}: {t?.status || 'empty'}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                        <QualityMeter score={health.score} />
                        {key.isIcu && (
                          <Sparkles className="size-3 text-info" />
                        )}
                      </div>
                      <p className="text-xs font-mono truncate">{key.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {getTranslation(key, 'en')?.value || '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== Key Editor Panel ===== */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Key Header */}
            <div className="px-4 py-3 border-b border-border bg-card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono font-semibold">{currentKey.name}</code>
                    <Badge variant="outline" className="text-[10px]">{currentKey.namespace}</Badge>
                    {currentKey.isIcu && (
                      <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/30">
                        ICU: {currentKey.icuType}
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn('text-[10px]', keyHealth.color)}>
                      {keyHealth.label} ({keyHealth.score}%)
                    </Badge>
                  </div>

                  {/* Editable description */}
                  {editingDescription ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                        onBlur={() => setEditingDescription(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingDescription(false);
                          if (e.key === 'Escape') {
                            setDescription(currentKey.description || '');
                            setEditingDescription(false);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <p
                      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => setEditingDescription(true)}
                    >
                      {description || 'Add description...'}
                      <Edit3 className="size-3 inline ml-1 opacity-50" />
                    </p>
                  )}
                </div>

                {/* Key actions */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8">
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Source Section */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇺🇸</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">Source</span>
                  <span className="text-xs text-muted-foreground">
                    {sourceTranslation?.value.length || 0} chars
                  </span>
                  {countPlaceholders(sourceTranslation?.value || '') > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {countPlaceholders(sourceTranslation?.value || '')} placeholders
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Copy className="size-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-card rounded-lg border border-border">
                <p className="text-sm font-mono whitespace-pre-wrap">{sourceTranslation?.value}</p>
              </div>
            </div>

            {/* Languages Stack */}
            <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
              {/* Batch actions */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {targetLanguages.length} target languages
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={translateAllEmpty}>
                    <Wand2 className="size-3 mr-1" />
                    Translate Empty
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <CheckCircle2 className="size-3 mr-1 text-success" />
                    Approve All
                  </Button>
                </div>
              </div>

              {/* Language rows */}
              {targetLanguages.map((lang) => {
                const translation = getTranslation(currentKey, lang.code);
                const value = getValue(currentKey, lang.code);
                const isExpanded = expandedLanguages.has(lang.code);
                const dimensions = getQualityDimensions(currentKey.id, lang.code);
                const issues = getQualityIssues(currentKey.id, lang.code);
                const aiSuggestion = getAISuggestion(currentKey.id, lang.code);
                const isAiLoading = aiLoadingLangs.has(lang.code);
                const isAiRevealed = aiRevealedLangs.has(lang.code);
                const isSaving = savingLangs.has(lang.code);
                const isSaved = savedLangs.has(lang.code);
                const charCount = value.length;
                const sourceCharCount = sourceTranslation?.value.length || 1;
                const lengthRatio = charCount / sourceCharCount;
                const placeholders = countPlaceholders(value);
                const sourcePlaceholders = countPlaceholders(sourceTranslation?.value || '');

                // Status-based styling
                const statusBorder = !value ? 'border-l-muted-foreground/40 border-dashed' :
                  translation?.status === 'approved' ? 'border-l-success' :
                  translation?.status === 'rejected' ? 'border-l-destructive' : 'border-l-warning';

                return (
                  <div
                    key={lang.code}
                    className={cn(
                      'rounded-xl border border-border overflow-hidden transition-all',
                      isExpanded && 'shadow-sm',
                      `border-l-[3px] ${statusBorder}`
                    )}
                  >
                    {/* Language Header (always visible) */}
                    <div
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                        isExpanded ? 'bg-card' : 'bg-card/50 hover:bg-card'
                      )}
                      onClick={() => toggleLanguage(lang.code)}
                    >
                      <ChevronRight className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-90'
                      )} />
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium w-20">{lang.name}</span>

                      {/* Quality meter */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <QualityMeter score={translation?.qualityScore || 0} showLabel />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <QualityDimensionTooltip dimensions={dimensions} score={translation?.qualityScore} />
                        </TooltipContent>
                      </Tooltip>

                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', getStatusColor(translation?.status || 'pending'))}
                      >
                        {!value ? 'empty' : translation?.status}
                      </Badge>

                      {/* Save indicator */}
                      {(isSaving || isSaved) && (
                        <div className="flex items-center gap-1 text-xs">
                          {isSaving ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              <span className="text-muted-foreground">Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="size-3 text-success" />
                              <span className="text-success">Saved</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Quick actions */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <Wand2 className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Machine Translate</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => fetchAI(lang.code)}
                            >
                              <Sparkles className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>AI Translate</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 text-success">
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Approve</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 text-destructive">
                              <XCircle className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reject</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Preview (when collapsed) */}
                      {!isExpanded && value && (
                        <p className="text-xs text-muted-foreground truncate max-w-48 font-mono">
                          {value}
                        </p>
                      )}
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-border bg-card">
                        {/* Editor */}
                        <Textarea
                          value={value}
                          onChange={(e) => {
                            setTranslations(prev => ({
                              ...prev,
                              [currentKey.id]: {
                                ...prev[currentKey.id],
                                [lang.code]: e.target.value,
                              },
                            }));
                          }}
                          onBlur={() => {
                            if (value !== (getTranslation(currentKey, lang.code)?.value || '')) {
                              saveTranslation(lang.code, value);
                            }
                          }}
                          placeholder={value ? undefined : 'Enter translation...'}
                          className={cn(
                            'min-h-[80px] font-mono text-sm resize-none',
                            !value && 'border-dashed'
                          )}
                        />

                        {/* Character count & placeholders */}
                        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              lengthRatio > 1.2 && 'text-warning',
                              lengthRatio > 1.5 && 'text-destructive'
                            )}>
                              {charCount} / {sourceCharCount} chars
                              {lengthRatio > 1.2 && ' (longer)'}
                            </span>
                            {sourcePlaceholders > 0 && (
                              <span className={cn(
                                placeholders !== sourcePlaceholders && 'text-destructive'
                              )}>
                                {placeholders} / {sourcePlaceholders} placeholders
                              </span>
                            )}
                          </div>
                          <span>
                            Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Tab</kbd> for next
                          </span>
                        </div>

                        {/* Quality issues */}
                        {issues.length > 0 && <QualityIssuesInline issues={issues} />}

                        {/* AI Loading or Suggestion */}
                        {isAiLoading && <AILoadingSkeleton />}
                        {isAiRevealed && aiSuggestion && (
                          <AISuggestionDisplay
                            suggestion={aiSuggestion}
                            onApply={(text) => applySuggestion(lang.code, text)}
                            isRevealing={true}
                          />
                        )}

                        {/* Empty state with CTA */}
                        {!value && !isAiLoading && (
                          <div className="mt-3 p-4 rounded-lg border border-dashed border-muted-foreground/30 text-center">
                            <Sparkles className="size-5 mx-auto mb-2 text-primary animate-pulse" />
                            <p className="text-xs text-muted-foreground mb-2">No translation yet</p>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => fetchAI(lang.code)}
                              >
                                <Wand2 className="size-3 mr-1" />
                                Auto-translate
                              </Button>
                              <span className="text-[10px] text-muted-foreground">or start typing</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ===== Bottom Dock ===== */}
            <div
              className="border-t border-border bg-card"
              style={{ height: bottomDockHeight }}
            >
              <Tabs value={activeBottomTab} onValueChange={setActiveBottomTab} className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 border-b border-border">
                  <TabsList className="h-10 bg-transparent p-0 gap-4">
                    <TabsTrigger
                      value="tm"
                      className="h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none text-sm"
                    >
                      <BookOpen className="size-4 mr-1.5 opacity-70" />
                      TM Matches
                    </TabsTrigger>
                    <TabsTrigger
                      value="glossary"
                      className="h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none text-sm"
                    >
                      <Type className="size-4 mr-1.5 opacity-70" />
                      Glossary
                    </TabsTrigger>
                    <TabsTrigger
                      value="ai"
                      className="h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none text-sm"
                    >
                      <Sparkles className="size-4 mr-1.5 opacity-70" />
                      AI Suggestions
                    </TabsTrigger>
                    <TabsTrigger
                      value="related"
                      className="h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none text-sm"
                    >
                      <Link2 className="size-4 mr-1.5 opacity-70" />
                      Related Keys
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TM Tab */}
                <TabsContent value="tm" className="flex-1 overflow-auto m-0 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {['de', 'fr', 'es'].map(langCode => {
                      const matches = getTmMatchesForLanguage(langCode);
                      const lang = languages.find(l => l.code === langCode);
                      return (
                        <div key={langCode} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{lang?.flag}</span>
                            <span>{lang?.name}</span>
                          </div>
                          {matches.slice(0, 2).map(match => (
                            <div
                              key={match.id}
                              className="p-2.5 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all hover:translate-x-0.5"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div
                                  className={cn(
                                    'size-8 rounded-full flex items-center justify-center text-[10px] font-semibold tabular-nums',
                                    match.similarity >= 95 ? 'bg-success/20 text-success' :
                                    match.similarity >= 80 ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'
                                  )}
                                >
                                  {match.similarity}%
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                                  Apply <ArrowRight className="size-3 ml-1" />
                                </Button>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{match.sourceText}</p>
                              <p className="text-xs font-mono mt-0.5">{match.targetText}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Glossary Tab */}
                <TabsContent value="glossary" className="flex-1 overflow-auto m-0 p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {['de', 'fr', 'es'].map(langCode => {
                      const terms = getGlossaryForLanguage(langCode);
                      const lang = languages.find(l => l.code === langCode);
                      return (
                        <div key={langCode}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span>{lang?.flag}</span>
                            <span>{lang?.name}</span>
                          </div>
                          <div className="space-y-1.5">
                            {terms.slice(0, 3).map(term => (
                              <div
                                key={term.id}
                                className="flex items-center justify-between p-2 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                              >
                                <div>
                                  <span className="text-xs font-medium">{term.term}</span>
                                  <span className="mx-1.5 text-muted-foreground">→</span>
                                  <span className="text-xs font-mono text-primary">{term.translation}</span>
                                </div>
                                {term.partOfSpeech && (
                                  <Badge variant="outline" className="text-[9px]">{term.partOfSpeech}</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* AI Suggestions Tab */}
                <TabsContent value="ai" className="flex-1 overflow-auto m-0 p-4">
                  <div className="space-y-4">
                    {/* Consistency alerts */}
                    <div className="p-3 rounded-lg border border-info/20 bg-info/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="size-4 text-info" />
                        <span className="text-xs font-medium text-info">Consistency Check</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Similar key <code className="text-primary">common.goodbye</code> uses "Auf Wiedersehen" in German.
                        Consider maintaining consistency.
                      </p>
                    </div>

                    {/* Glossary compliance */}
                    <div className="p-3 rounded-lg border border-success/20 bg-success/5">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="size-4 text-success" />
                        <span className="text-xs font-medium text-success">Glossary Compliance</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        All translations use approved terminology from your glossary.
                      </p>
                    </div>

                    {/* Style tip */}
                    <div className="p-3 rounded-lg border border-warning/20 bg-warning/5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="size-4 text-warning" />
                        <span className="text-xs font-medium text-warning">Style Guide Tip</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        German translations should use formal "Sie" form for user-facing messages.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Related Keys Tab */}
                <TabsContent value="related" className="flex-1 overflow-auto m-0 p-4">
                  {relatedKeys.length > 0 ? (
                    <div className="space-y-3">
                      {/* Group by relationship type */}
                      {['same_namespace', 'same_file', 'semantic'].map(relType => {
                        const keys = relatedKeys.filter(k => k.relationship === relType);
                        if (keys.length === 0) return null;

                        const icon = relType === 'same_namespace' ? <Link2 className="size-3.5" /> :
                                     relType === 'same_file' ? <FileCode className="size-3.5" /> :
                                     <Brain className="size-3.5" />;
                        const label = relType === 'same_namespace' ? 'Same Namespace' :
                                      relType === 'same_file' ? 'Same File' : 'Semantic Similarity';

                        return (
                          <div key={relType}>
                            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                              {icon}
                              <span>{label}</span>
                            </div>
                            <div className="space-y-1.5">
                              {keys.map(key => (
                                <div
                                  key={key.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                                  onClick={() => setSelectedKeyId(key.id)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs font-mono">{key.name}</code>
                                      {key.confidence && (
                                        <Badge variant="outline" className="text-[9px]">
                                          {key.confidence}% match
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                      {key.sourceText}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                                    View <ArrowRight className="size-3 ml-1" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link2 className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No related keys found</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Floating Batch Action Bar */}
        {selectedKeys.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
            <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 pr-3 border-r border-border">
                <Checkbox
                  checked={true}
                  onCheckedChange={() => setSelectedKeys(new Set())}
                />
                <span className="text-sm font-medium">
                  {selectedKeys.size} key{selectedKeys.size > 1 ? 's' : ''} selected
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  // Batch translate all selected keys
                  selectedKeys.forEach(keyId => {
                    const key = mockKeys.find(k => k.id === keyId);
                    if (key) {
                      targetLanguages.forEach(lang => {
                        const value = getValue(key, lang.code);
                        if (!value) {
                          setAiLoadingLangs(prev => new Set([...prev, `${keyId}-${lang.code}`]));
                          setTimeout(() => {
                            setAiLoadingLangs(prev => {
                              const next = new Set(prev);
                              next.delete(`${keyId}-${lang.code}`);
                              return next;
                            });
                          }, 1500);
                        }
                      });
                    }
                  });
                }}
              >
                <Wand2 className="size-4 mr-1.5" />
                Translate All
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  // Batch approve all selected keys - just visual feedback
                  setSelectedKeys(new Set());
                }}
              >
                <CheckCircle2 className="size-4 mr-1.5 text-success" />
                Approve All
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  // Evaluate quality for all selected keys
                }}
              >
                <BarChart3 className="size-4 mr-1.5" />
                Evaluate Quality
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={() => setSelectedKeys(new Set())}
              >
                <X className="size-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Custom keyframes */}
        <style jsx global>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes blink {
            0%, 80%, 100% { opacity: 0.2; }
            40% { opacity: 1; }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
