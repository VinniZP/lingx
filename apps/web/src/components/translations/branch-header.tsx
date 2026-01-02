'use client';

import { GitBranch, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';

interface BranchHeaderProps {
  branchName: string;
  changesCount?: number;
  completionPercent?: number;
  translatorsOnline?: number;
}

export function BranchHeader({
  branchName,
  changesCount = 0,
  completionPercent,
  translatorsOnline,
}: BranchHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Branch info */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
          <GitBranch className="size-4" />
          <span className="text-sm font-medium">{branchName}</span>
        </div>
        {changesCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {t('translations.branchHeader.changes', { count: changesCount })}
          </span>
        )}
      </div>

      {/* Right side stats */}
      <div className="flex items-center gap-4">
        {/* Translators online (placeholder) */}
        {translatorsOnline !== undefined && translatorsOnline > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span>{t('translations.branchHeader.translatorsOnline', { count: translatorsOnline })}</span>
          </div>
        )}

        {/* Completion percentage */}
        {completionPercent !== undefined && (
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            <span>{t('translations.branchHeader.complete', { percent: completionPercent })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
