'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Loader2, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface BatchActionsBarProps {
  selectedCount: number;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
}

export function BatchActionsBar({
  selectedCount,
  isApproving,
  onApprove,
  onReject,
  onClear,
}: BatchActionsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-3 border-b border-border/40 bg-primary/5 flex items-center gap-3 animate-slide-down">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold tabular-nums">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-foreground">
          {t('translations.batch.keysSelected', { count: selectedCount })}
        </span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-success border-success/30 hover:bg-success/10"
          onClick={onApprove}
          disabled={isApproving}
        >
          {isApproving ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4" />}
          {t('translations.batch.approveAll')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={onReject}
          disabled={isApproving}
        >
          {isApproving ? <Loader2 className="size-4 animate-spin" /> : <ThumbsDown className="size-4" />}
          {t('translations.batch.rejectAll')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={isApproving}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
