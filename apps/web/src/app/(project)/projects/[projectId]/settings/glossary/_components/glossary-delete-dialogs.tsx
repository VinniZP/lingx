'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { GlossaryEntry, GlossaryTag } from '@/lib/api';

interface DeleteEntryDialogProps {
  entry: GlossaryEntry | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteEntryDialog({
  entry,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteEntryDialogProps) {
  const { t } = useTranslation('glossary');

  return (
    <AlertDialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteEntry.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteEntry.description', { term: entry?.sourceTerm || '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteTagDialogProps {
  tag: GlossaryTag | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTagDialog({
  tag,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteTagDialogProps) {
  const { t } = useTranslation('glossary');

  return (
    <AlertDialog open={!!tag} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteTag.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteTag.description', { name: tag?.name || '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
