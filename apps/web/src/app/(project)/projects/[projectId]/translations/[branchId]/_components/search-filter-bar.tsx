'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Folder } from 'lucide-react';
import type { NamespaceCount } from '@lingx/shared';

export type FilterType = 'all' | 'missing' | 'complete' | 'pending' | 'approved' | 'rejected' | 'warnings';

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (value: FilterType) => void;
  namespace: string;
  onNamespaceChange: (value: string) => void;
  namespaces: NamespaceCount[];
  canApprove: boolean;
  hasKeys: boolean;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  namespace,
  onNamespaceChange,
  namespaces,
  canApprove,
  hasKeys,
  allSelected,
  onSelectAll,
}: SearchFilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3">
      {canApprove && hasKeys && (
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className="shrink-0"
        />
      )}

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('translations.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-0 bg-transparent shadow-none focus-visible:ring-0 h-9"
        />
      </div>

      {/* Namespace filter */}
      {namespaces.length > 0 && (
        <Select value={namespace || '__all__'} onValueChange={(v) => onNamespaceChange(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[150px] h-9 border-0 bg-muted/50">
            <Folder className="h-3.5 w-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('translations.filters.allNamespaces')}</SelectItem>
            <SelectItem value="__root__">{t('translations.filters.noNamespace')}</SelectItem>
            {namespaces
              .filter((ns) => ns.namespace)
              .map((ns) => (
                <SelectItem key={ns.namespace} value={ns.namespace!}>
                  {ns.namespace} ({ns.count})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {/* Status filter */}
      <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
        <SelectTrigger className="w-[150px] h-9 border-0 bg-muted/50">
          <Filter className="h-3.5 w-3.5 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('translations.filters.all')}</SelectItem>
          <SelectItem value="missing">{t('translations.filters.missing')}</SelectItem>
          <SelectItem value="complete">{t('translations.filters.complete')}</SelectItem>
          <SelectItem value="pending">{t('translations.filters.pending')}</SelectItem>
          <SelectItem value="approved">{t('translations.filters.approved')}</SelectItem>
          <SelectItem value="rejected">{t('translations.filters.rejected')}</SelectItem>
          <SelectItem value="warnings">{t('translations.filters.warnings')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
