'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { BranchHeader } from '@/components/translations';

interface BranchStatsBarProps {
  branchName: string;
  completionPercent: number;
  totalKeys: number;
  languageCount: number;
}

export function BranchStatsBar({
  branchName,
  completionPercent,
  totalKeys,
  languageCount,
}: BranchStatsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
      <div className="flex items-center justify-between gap-4">
        <BranchHeader
          branchName={branchName}
          completionPercent={completionPercent}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums font-medium">{totalKeys}</span>
          <span>{t('translations.stats.keys')}</span>
          <span className="text-border">•</span>
          <span className="tabular-nums font-medium">{languageCount}</span>
          <span>{t('translations.stats.languages')}</span>
        </div>
      </div>
    </div>
  );
}
