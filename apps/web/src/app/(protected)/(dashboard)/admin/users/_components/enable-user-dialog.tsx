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
import { UserCheck } from 'lucide-react';

interface UserInfo {
  name: string | null;
  email: string;
}

interface EnableUserDialogProps {
  user: UserInfo | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function EnableUserDialog({
  user,
  onOpenChange,
  onConfirm,
  isPending,
}: EnableUserDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-success/10 border-success/20 flex size-14 items-center justify-center rounded-2xl border">
            <UserCheck className="text-success size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">{t('admin.enable.title')}</AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('admin.enable.description', { name: user?.name || user?.email || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-success text-success-foreground hover:bg-success/90 rounded-xl"
          >
            {t('admin.enable.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
