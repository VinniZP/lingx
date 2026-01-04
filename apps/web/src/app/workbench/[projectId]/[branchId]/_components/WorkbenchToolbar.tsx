'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import {
  ArrowLeft,
  GitBranch,
  HelpCircle,
  Key,
  Languages,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { type FilterType, type QualityFilterType } from '../_hooks';

interface WorkbenchToolbarProps {
  projectId: string;
  branchName: string;
  completionPercent: number;
  totalKeys: number;
  languageCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (value: FilterType) => void;
  qualityFilter: QualityFilterType;
  onQualityFilterChange: (value: QualityFilterType) => void;
  namespace: string;
  onNamespaceChange: (value: string) => void;
  namespaces: string[];
  onCreateKey: () => void;
  onEvaluateQuality: () => void;
  onShowGuide: () => void;
}

export function WorkbenchToolbar({
  projectId,
  branchName,
  completionPercent,
  totalKeys,
  languageCount,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  qualityFilter,
  onQualityFilterChange,
  namespace,
  onNamespaceChange,
  namespaces,
  onCreateKey,
  onEvaluateQuality,
  onShowGuide,
}: WorkbenchToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="border-border bg-card flex items-center gap-4 border-b px-4 py-3">
      {/* Back Button */}
      <Link href={`/projects/${projectId}`}>
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="size-4" />
          {t('workbench.toolbar.back')}
        </Button>
      </Link>

      <div className="bg-border h-6 w-px" />

      {/* Branch Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <GitBranch className="text-muted-foreground size-4" />
          <span className="font-medium">{branchName}</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'font-mono tabular-nums',
            completionPercent >= 80
              ? 'bg-success/10 text-success border-success/30'
              : completionPercent >= 50
                ? 'bg-warning/10 text-warning border-warning/30'
                : 'bg-muted'
          )}
        >
          {completionPercent}%
        </Badge>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Key className="size-3" />
          <span>{totalKeys}</span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Languages className="size-3" />
          <span>{languageCount}</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-64 transition-all focus-within:w-80">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={t('workbench.toolbar.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      {/* Filters */}
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder={t('workbench.toolbar.statusFilter.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('workbench.toolbar.statusFilter.all')}</SelectItem>
          <SelectItem value="missing">{t('workbench.toolbar.statusFilter.missing')}</SelectItem>
          <SelectItem value="complete">{t('workbench.toolbar.statusFilter.complete')}</SelectItem>
          <SelectItem value="pending">{t('workbench.toolbar.statusFilter.pending')}</SelectItem>
          <SelectItem value="approved">{t('workbench.toolbar.statusFilter.approved')}</SelectItem>
          <SelectItem value="rejected">{t('workbench.toolbar.statusFilter.rejected')}</SelectItem>
          <SelectItem value="warnings">{t('workbench.toolbar.statusFilter.warnings')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={qualityFilter} onValueChange={onQualityFilterChange}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder={t('workbench.toolbar.qualityFilter.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('workbench.toolbar.qualityFilter.all')}</SelectItem>
          <SelectItem value="excellent">
            {t('workbench.toolbar.qualityFilter.excellent')}
          </SelectItem>
          <SelectItem value="good">{t('workbench.toolbar.qualityFilter.good')}</SelectItem>
          <SelectItem value="needsReview">
            {t('workbench.toolbar.qualityFilter.needsReview')}
          </SelectItem>
          <SelectItem value="unscored">{t('workbench.toolbar.qualityFilter.unscored')}</SelectItem>
        </SelectContent>
      </Select>

      {namespaces.length > 0 && (
        <Select
          value={namespace || 'all'}
          onValueChange={(v) => onNamespaceChange(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder={t('workbench.toolbar.namespaceFilter.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('workbench.toolbar.namespaceFilter.all')}</SelectItem>
            {namespaces.map((ns) => (
              <SelectItem key={ns} value={ns}>
                {ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="bg-border h-6 w-px" />

      {/* Actions */}
      <Button variant="ghost" size="sm" onClick={onEvaluateQuality} className="gap-2">
        <Sparkles className="size-4" />
        {t('workbench.toolbar.evaluate')}
      </Button>

      <Button variant="ghost" size="sm" onClick={onShowGuide} className="gap-2">
        <HelpCircle className="size-4" />
        {t('workbench.toolbar.help')}
      </Button>

      <Button size="sm" onClick={onCreateKey} className="gap-2">
        <Plus className="size-4" />
        {t('workbench.toolbar.addKey')}
      </Button>
    </div>
  );
}
