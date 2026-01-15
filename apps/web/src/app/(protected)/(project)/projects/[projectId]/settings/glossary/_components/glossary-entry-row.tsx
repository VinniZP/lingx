'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GlossaryEntry } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import { ChevronRight, Hash, Pencil, Trash2 } from 'lucide-react';

interface GlossaryEntryRowProps {
  entry: GlossaryEntry;
  index: number;
  onEdit: (entry: GlossaryEntry) => void;
  onDelete: (entry: GlossaryEntry) => void;
}

export function GlossaryEntryRow({ entry, index, onEdit, onDelete }: GlossaryEntryRowProps) {
  const { t } = useTranslation('glossary');

  return (
    <div
      className="hover:bg-muted/30 group px-6 py-5 transition-colors"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="font-mono text-base font-semibold">{entry.sourceTerm}</span>
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium">
              {entry.sourceLanguage}
            </Badge>
            {entry.caseSensitive && (
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
                Aa
              </Badge>
            )}
            {entry.partOfSpeech && (
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px] capitalize">
                {entry.partOfSpeech.toLowerCase()}
              </Badge>
            )}
          </div>

          {/* Translations */}
          {entry.translations.length > 0 && (
            <div className="mb-3 flex items-center gap-3 text-sm">
              <ChevronRight className="text-muted-foreground/50 size-3.5" />
              <div className="flex flex-wrap items-center gap-4">
                {entry.translations.slice(0, 3).map((trans) => (
                  <span key={trans.id} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/70 text-[10px] font-medium uppercase">
                      {trans.targetLanguage}
                    </span>
                    <span className="font-medium">{trans.targetTerm}</span>
                  </span>
                ))}
                {entry.translations.length > 3 && (
                  <span className="text-muted-foreground text-xs">
                    {t('entry.moreTranslations', { count: entry.translations.length - 3 })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tags and metadata */}
          <div className="flex flex-wrap items-center gap-2">
            {entry.domain && (
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <Hash className="size-2.5" />
                {entry.domain}
              </Badge>
            )}
            {entry.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="gap-1 text-[10px] font-medium"
                style={
                  tag.color
                    ? {
                        backgroundColor: `${tag.color}12`,
                        borderColor: `${tag.color}25`,
                        color: tag.color,
                      }
                    : undefined
                }
              >
                {tag.name}
              </Badge>
            ))}
            {entry.context && (
              <span className="text-muted-foreground max-w-[240px] truncate text-xs italic">
                &ldquo;{entry.context}&rdquo;
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(entry)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
