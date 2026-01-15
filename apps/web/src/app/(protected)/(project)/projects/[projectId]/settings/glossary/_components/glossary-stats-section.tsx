'use client';

import type { GlossaryStats } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import { BarChart3, BookOpen, Globe, Hash, Languages, Tag, TrendingUp } from 'lucide-react';

interface GlossaryStatsSectionProps {
  stats: GlossaryStats | undefined;
  tagsCount: number;
}

export function GlossaryStatsSection({ stats, tagsCount }: GlossaryStatsSectionProps) {
  const { t } = useTranslation('glossary');

  return (
    <section className="animate-fade-in-up space-y-6">
      <div className="flex items-center gap-4">
        <div className="from-primary/20 via-primary/10 border-primary/10 flex size-12 items-center justify-center rounded-2xl border bg-linear-to-br to-transparent shadow-sm">
          <BarChart3 className="text-primary size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('stats.title')}</h2>
          <p className="text-muted-foreground text-sm">{t('stats.description')}</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {/* Total Terms */}
        <div className="island group relative overflow-hidden p-6">
          <div className="from-primary/5 absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-gradient-to-bl to-transparent" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="from-primary/15 to-primary/5 border-primary/10 flex size-11 items-center justify-center rounded-xl border bg-linear-to-br">
                <BookOpen className="text-primary size-5" />
              </div>
              <div className="text-success flex items-center gap-1 text-xs">
                <TrendingUp className="size-3" />
                <span className="font-medium">{t('stats.active')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                {t('stats.totalTerms')}
              </p>
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                {stats?.totalEntries ?? 0}
              </div>
              <p className="text-muted-foreground text-sm">
                {t('stats.translationsAcross', { count: stats?.totalTranslations ?? 0 })}
              </p>
            </div>
          </div>
        </div>

        {/* Language Pairs */}
        <div className="island group animate-fade-in-up stagger-1 relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-gradient-to-bl from-blue-500/5 to-transparent" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-xl border border-blue-500/10 bg-linear-to-br from-blue-500/15 to-blue-500/5">
                <Languages className="size-5 text-blue-500" />
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <Globe className="size-3" />
                <span className="font-medium">{t('stats.pairs')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                {t('stats.languagePairs')}
              </p>
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                {stats?.languagePairs?.length ?? 0}
              </div>
              <p className="text-muted-foreground text-sm">{t('stats.activeCombinations')}</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="island group animate-fade-in-up stagger-2 relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-gradient-to-bl from-amber-500/5 to-transparent" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-xl border border-amber-500/10 bg-linear-to-br from-amber-500/15 to-amber-500/5">
                <Tag className="size-5 text-amber-500" />
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <Hash className="size-3" />
                <span className="font-medium">{t('stats.categories')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                {t('stats.tagsDefined')}
              </p>
              <div className="text-4xl font-bold tracking-tight tabular-nums">{tagsCount}</div>
              <p className="text-muted-foreground text-sm">{t('stats.organizationalCategories')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
