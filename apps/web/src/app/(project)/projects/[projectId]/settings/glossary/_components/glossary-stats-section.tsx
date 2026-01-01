'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import {
  BookOpen,
  Languages,
  Tag,
  BarChart3,
  Globe,
  Hash,
  TrendingUp,
} from 'lucide-react';
import type { GlossaryStats, GlossaryTag } from '@/lib/api';

interface GlossaryStatsSectionProps {
  stats: GlossaryStats | undefined;
  tagsCount: number;
}

export function GlossaryStatsSection({ stats, tagsCount }: GlossaryStatsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/10 flex items-center justify-center shadow-sm">
          <BarChart3 className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t('glossary.stats.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('glossary.stats.description')}
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {/* Total Terms */}
        <div className="island p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center">
                <BookOpen className="size-5 text-primary" />
              </div>
              <div className="flex items-center gap-1 text-xs text-success">
                <TrendingUp className="size-3" />
                <span className="font-medium">{t('glossary.stats.active')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('glossary.stats.totalTerms')}
              </p>
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                {stats?.totalEntries ?? 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('glossary.stats.translationsAcross', { count: stats?.totalTranslations ?? 0 })}
              </p>
            </div>
          </div>
        </div>

        {/* Language Pairs */}
        <div className="island p-6 relative overflow-hidden group animate-fade-in-up stagger-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="size-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/10 flex items-center justify-center">
                <Languages className="size-5 text-blue-500" />
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <Globe className="size-3" />
                <span className="font-medium">{t('glossary.stats.pairs')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('glossary.stats.languagePairs')}
              </p>
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                {stats?.languagePairs?.length ?? 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('glossary.stats.activeCombinations')}
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="island p-6 relative overflow-hidden group animate-fade-in-up stagger-2">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="size-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/10 flex items-center justify-center">
                <Tag className="size-5 text-amber-500" />
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <Hash className="size-3" />
                <span className="font-medium">{t('glossary.stats.categories')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('glossary.stats.tagsDefined')}
              </p>
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                {tagsCount}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('glossary.stats.organizationalCategories')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
