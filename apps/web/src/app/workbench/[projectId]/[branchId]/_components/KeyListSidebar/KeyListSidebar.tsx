'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { forwardRef } from 'react';
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
  // Keyboard navigation
  isKeyFocused: (index: number) => boolean;
}

export const KeyListSidebar = forwardRef<HTMLDivElement, KeyListSidebarProps>(
  function KeyListSidebar(
    {
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
      isKeyFocused,
    },
    ref
  ) {
    return (
      <div ref={ref} className="border-border bg-card flex w-72 flex-col border-r">
        {/* Header */}
        <div className="border-border flex items-center gap-2 border-b px-3 py-2">
          {canApprove && <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} />}
          <span className="flex-1 text-sm font-medium">Keys</span>
          <Badge variant="outline" className="text-xs tabular-nums">
            {keys.length}
          </Badge>
          {selectedKeys.size > 0 && (
            <Badge className="text-xs tabular-nums">{selectedKeys.size} selected</Badge>
          )}
        </div>

        {/* Key List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">No keys found</p>
              <p className="text-muted-foreground/70 mt-1 text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-border/50 divide-y" role="listbox" aria-label="Translation keys">
              {keys.map((key, index) => (
                <KeyListItem
                  key={key.id}
                  keyData={key}
                  keyIndex={index}
                  isSelected={selectedKeyId === key.id}
                  isChecked={selectedKeys.has(key.id)}
                  isFocused={isKeyFocused(index)}
                  onSelect={() => onSelectKey(key.id)}
                  onCheck={(checked) => onSelectionChange(key.id, checked)}
                  canApprove={canApprove}
                  targetLanguages={targetLanguages}
                  sourcePreview={
                    defaultLanguage ? getTranslationValue(key, defaultLanguage.code) : ''
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-border flex items-center justify-between border-t px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-muted-foreground text-xs tabular-nums">
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
);
