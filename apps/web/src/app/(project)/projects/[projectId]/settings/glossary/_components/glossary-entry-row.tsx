'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ChevronRight, Hash } from 'lucide-react';
import type { GlossaryEntry } from '@/lib/api';

interface GlossaryEntryRowProps {
  entry: GlossaryEntry;
  index: number;
  onEdit: (entry: GlossaryEntry) => void;
  onDelete: (entry: GlossaryEntry) => void;
}

export function GlossaryEntryRow({
  entry,
  index,
  onEdit,
  onDelete,
}: GlossaryEntryRowProps) {
  const { t } = useTranslation();

  return (
    <div
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
                {entry.translations.slice(0, 3).map((trans) => (
                  <span key={trans.id} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/70 font-medium uppercase">
                      {trans.targetLanguage}
                    </span>
                    <span className="font-medium">{trans.targetTerm}</span>
                  </span>
                ))}
                {entry.translations.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    {t('glossary.entry.moreTranslations', { count: entry.translations.length - 3 })}
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
            onClick={() => onEdit(entry)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
