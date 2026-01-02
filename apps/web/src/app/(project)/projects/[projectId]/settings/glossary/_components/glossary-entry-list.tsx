'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import type { GlossaryEntry } from '@/lib/api';
import { GlossaryEntryRow } from './glossary-entry-row';

interface GlossaryEntryListProps {
  entries: GlossaryEntry[];
  isLoading: boolean;
  hasFilters: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (entry: GlossaryEntry) => void;
  onDelete: (entry: GlossaryEntry) => void;
  onCreateFirst: () => void;
}

export function GlossaryEntryList({
  entries,
  isLoading,
  hasFilters,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onCreateFirst,
}: GlossaryEntryListProps) {
  const { t } = useTranslation('glossary');

  if (isLoading) {
    return (
      <div className="island overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('list.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="island overflow-hidden">
        <div className="py-20 text-center">
          <div className="relative inline-flex mb-6">
            <div className="size-20 rounded-3xl bg-linear-to-br from-muted/80 to-muted/40 flex items-center justify-center">
              <BookOpen className="size-8 text-muted-foreground/60" />
            </div>
            <div className="absolute -bottom-1 -right-1 size-8 rounded-xl bg-primary/10 border-2 border-background flex items-center justify-center">
              <Plus className="size-4 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {hasFilters
              ? t('list.noMatching')
              : t('list.startBuilding')}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {hasFilters
              ? t('list.adjustFilters')
              : t('list.addTerminology')}
          </p>
          {!hasFilters && (
            <Button onClick={onCreateFirst} className="gap-2">
              <Plus className="size-4" />
              {t('list.addFirstTerm')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="island overflow-hidden">
      <div className="divide-y divide-border/50">
        {entries.map((entry, index) => (
          <GlossaryEntryRow
            key={entry.id}
            entry={entry}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('pagination.pageOf', { page, total: totalPages })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
