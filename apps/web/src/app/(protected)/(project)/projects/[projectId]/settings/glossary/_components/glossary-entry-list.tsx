'use client';

import { Button } from '@/components/ui/button';
import type { GlossaryEntry } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import { BookOpen, Loader2, Plus } from 'lucide-react';
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
          <div className="bg-primary/10 mb-4 flex size-12 items-center justify-center rounded-2xl">
            <Loader2 className="text-primary size-6 animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">{t('list.loading')}</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="island overflow-hidden">
        <div className="py-20 text-center">
          <div className="relative mb-6 inline-flex">
            <div className="from-muted/80 to-muted/40 flex size-20 items-center justify-center rounded-3xl bg-linear-to-br">
              <BookOpen className="text-muted-foreground/60 size-8" />
            </div>
            <div className="bg-primary/10 border-background absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-xl border-2">
              <Plus className="text-primary size-4" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            {hasFilters ? t('list.noMatching') : t('list.startBuilding')}
          </h3>
          <p className="text-muted-foreground mx-auto mb-6 max-w-sm text-sm">
            {hasFilters ? t('list.adjustFilters') : t('list.addTerminology')}
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
      <div className="divide-border/50 divide-y">
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
        <div className="border-border/50 bg-muted/20 flex items-center justify-between border-t px-6 py-4">
          <span className="text-muted-foreground text-sm tabular-nums">
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
