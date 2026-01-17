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
import { UserX } from 'lucide-react';

interface UserInfo {
  name: string | null;
  email: string;
}

interface DisableUserDialogProps {
  user: UserInfo | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DisableUserDialog({
  user,
  onOpenChange,
  onConfirm,
  isPending,
}: DisableUserDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-destructive/10 border-destructive/20 flex size-14 items-center justify-center rounded-2xl border">
            <UserX className="text-destructive size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">{t('admin.disable.title')}</AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('admin.disable.description', { name: user?.name || user?.email || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">{t('admin.disable.warning')}</p>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
          >
            {t('admin.disable.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
