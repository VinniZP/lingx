'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectStatsDetailed } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectLanguage } from '@lingx/shared';
import { CheckCircle2 } from 'lucide-react';

interface TranslationCoverageCardProps {
  languages: ProjectLanguage[];
  stats: ProjectStatsDetailed | undefined;
  isLoading: boolean;
}

/**
 * TranslationCoverageCard - Shows translation progress for each language
 */
export function TranslationCoverageCard({
  languages,
  stats,
  isLoading,
}: TranslationCoverageCardProps) {
  const { t } = useTranslation();

  return (
    <div className="island animate-fade-in-up stagger-3">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold">{t('projectDetail.translationCoverage.title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('projectDetail.translationCoverage.subtitle')}
        </p>
      </div>

      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {languages.map((lang) => {
              const langStats = stats?.translationsByLanguage[lang.code];
              const percentage = langStats?.percentage || 0;
              const isComplete = percentage === 100;

              return (
                <div key={lang.code} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lang.name}</span>
                      {lang.isDefault && (
                        <span className="bg-primary/10 text-primary border-primary/20 rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                          {t('projectDetail.translationCoverage.default')}
                        </span>
                      )}
                      {isComplete && <CheckCircle2 className="text-success size-4" />}
                    </div>
                    <span className="text-muted-foreground font-mono text-xs">
                      {langStats?.translated || 0} / {langStats?.total || 0}{' '}
                      <span
                        className={cn(
                          'font-semibold',
                          isComplete ? 'text-success' : 'text-foreground'
                        )}
                      >
                        ({percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="bg-muted/50 h-2 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isComplete ? 'bg-success' : 'bg-primary'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
