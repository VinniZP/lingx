'use client';

import { Button } from '@/components/ui/button';
import type { GlossaryTag } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Plus, Tag, X } from 'lucide-react';

interface GlossaryTagsSectionProps {
  tags: GlossaryTag[];
  onCreateTag: () => void;
  onDeleteTag: (tag: GlossaryTag) => void;
}

export function GlossaryTagsSection({ tags, onCreateTag, onDeleteTag }: GlossaryTagsSectionProps) {
  const { t } = useTranslation('glossary');

  return (
    <section className="animate-fade-in-up stagger-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-amber-500/10 bg-linear-to-br from-amber-500/20 via-amber-500/10 to-transparent shadow-sm">
            <Tag className="size-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('tags.title')}</h2>
            <p className="text-muted-foreground text-sm">{t('tags.description')}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-9 gap-2" onClick={onCreateTag}>
          <Plus className="size-4" />
          {t('tags.addTag')}
        </Button>
      </div>

      <div className="island p-6">
        {tags.length === 0 ? (
          <div className="py-10 text-center">
            <div className="relative mb-5 inline-flex">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500/10 to-transparent">
                <Tag className="size-7 text-amber-500/60" />
              </div>
            </div>
            <h3 className="mb-1.5 text-base font-semibold">{t('tags.noTagsYet')}</h3>
            <p className="text-muted-foreground mx-auto mb-5 max-w-xs text-sm">
              {t('tags.createToOrganize')}
            </p>
            <Button size="sm" variant="outline" className="gap-2" onClick={onCreateTag}>
              <Plus className="size-4" />
              {t('tags.createFirstTag')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className={cn(
                  'inline-flex items-center gap-2.5 rounded-xl border px-4 py-2',
                  'bg-card hover:bg-muted/50 group cursor-default transition-all duration-200'
                )}
                style={
                  tag.color
                    ? {
                        borderColor: `${tag.color}30`,
                      }
                    : undefined
                }
              >
                {tag.color && (
                  <div
                    className="size-3 rounded-full shadow-sm"
                    style={{
                      backgroundColor: tag.color,
                      boxShadow: `0 0 0 2px var(--card), 0 0 0 4px ${tag.color}40`,
                    }}
                  />
                )}
                <span className="text-sm font-medium">{tag.name}</span>
                <button
                  onClick={() => onDeleteTag(tag)}
                  className="text-muted-foreground hover:text-destructive ml-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
