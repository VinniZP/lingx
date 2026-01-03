'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { KeyListItem } from './KeyListItem';

interface KeyListSidebarProps {
  keys: TranslationKey[];
  selectedKeyId: string | null;
  onSelectKey: (keyId: string) => void;
  selectedKeys: Set<string>;
  onSelectionChange: (keyId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  isAllSelected: boolean;
  canApprove: boolean;
  isLoading: boolean;
  defaultLanguage?: ProjectLanguage;
  targetLanguages: string[];
  getTranslationValue: (key: TranslationKey, lang: string) => string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function KeyListSidebar({
  keys,
  selectedKeyId,
  onSelectKey,
  selectedKeys,
  onSelectionChange,
  onSelectAll,
  isAllSelected,
  canApprove,
  isLoading,
  defaultLanguage,
  targetLanguages,
  getTranslationValue,
  page,
  totalPages,
  onPageChange,
}: KeyListSidebarProps) {
  return (
    <div className="w-72 border-r border-border flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        {canApprove && (
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onSelectAll}
          />
        )}
        <span className="text-sm font-medium flex-1">Keys</span>
        <Badge variant="outline" className="text-xs tabular-nums">
          {keys.length}
        </Badge>
        {selectedKeys.size > 0 && (
          <Badge className="text-xs tabular-nums">
            {selectedKeys.size} selected
          </Badge>
        )}
      </div>

      {/* Key List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">No keys found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {keys.map((key) => (
              <KeyListItem
                key={key.id}
                keyData={key}
                isSelected={selectedKeyId === key.id}
                isChecked={selectedKeys.has(key.id)}
                onSelect={() => onSelectKey(key.id)}
                onCheck={(checked) => onSelectionChange(key.id, checked)}
                canApprove={canApprove}
                targetLanguages={targetLanguages}
                getTranslationValue={getTranslationValue}
                sourcePreview={
                  defaultLanguage
                    ? getTranslationValue(key, defaultLanguage.code)
                    : ''
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
