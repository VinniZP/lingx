'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, ThumbsUp, ThumbsDown, X, Trash2, Sparkles, Zap } from 'lucide-react';

interface BatchActionsBarProps {
  selectedCount: number;
  isApproving: boolean;
  isDeleting?: boolean;
  isTranslating?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onTranslateEmpty?: (provider: 'MT' | 'AI') => void;
  onClear: () => void;
  hasMT?: boolean;
  hasAI?: boolean;
}

export function BatchActionsBar({
  selectedCount,
  isApproving,
  isDeleting = false,
  isTranslating = false,
  onApprove,
  onReject,
  onDelete,
  onTranslateEmpty,
  onClear,
  hasMT = false,
  hasAI = false,
}: BatchActionsBarProps) {
  const { t } = useTranslation();
  const isDisabled = isApproving || isDeleting || isTranslating;

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
        {/* Translate Empty dropdown */}
        {onTranslateEmpty && (hasMT || hasAI) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isDisabled}
              >
                {isTranslating ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                {t('translations.batch.translateEmpty')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {hasMT && (
                <DropdownMenuItem onClick={() => onTranslateEmpty('MT')}>
                  <Zap className="size-4 mr-2" />
                  {t('translations.batch.machineTranslate')}
                </DropdownMenuItem>
              )}
              {hasAI && (
                <DropdownMenuItem onClick={() => onTranslateEmpty('AI')}>
                  <Sparkles className="size-4 mr-2" />
                  {t('translations.batch.aiTranslate')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-success border-success/30 hover:bg-success/10"
          onClick={onApprove}
          disabled={isDisabled}
        >
          {isApproving ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4" />}
          {t('translations.batch.approveAll')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={onReject}
          disabled={isDisabled}
        >
          {isApproving ? <Loader2 className="size-4 animate-spin" /> : <ThumbsDown className="size-4" />}
          {t('translations.batch.rejectAll')}
        </Button>

        {/* Delete with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={isDisabled}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {t('translations.batch.delete')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('translations.batch.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('translations.batch.deleteDescription', { count: selectedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('translations.batch.confirmDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="ghost" size="sm" onClick={onClear} disabled={isDisabled}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
