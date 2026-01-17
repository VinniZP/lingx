'use client';

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
import { useTranslation } from '@lingx/sdk-nextjs';
import { Loader2, Trash2 } from 'lucide-react';
import { useDeletePasskey } from './use-passkeys';

interface DeletePasskeyDialogProps {
  credentialId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function DeletePasskeyDialog({ credentialId, onOpenChange }: DeletePasskeyDialogProps) {
  const { t } = useTranslation();

  const deleteMutation = useDeletePasskey({
    onSuccess: () => onOpenChange(false),
  });

  const handleDelete = () => {
    if (credentialId) {
      deleteMutation.mutate(credentialId);
    }
  };

  return (
    <AlertDialog open={!!credentialId} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-destructive/10 border-destructive/20 flex size-14 items-center justify-center rounded-2xl border">
            <Trash2 className="text-destructive size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">
              {t('security.passkeys.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('security.passkeys.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('security.passkeys.deleteDialog.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
