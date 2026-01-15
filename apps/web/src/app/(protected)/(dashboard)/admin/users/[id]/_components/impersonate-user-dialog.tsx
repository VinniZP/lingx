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
import { AlertTriangle, UserMinus } from 'lucide-react';

interface UserInfo {
  name: string | null;
  email: string;
}

interface ImpersonateUserDialogProps {
  user: UserInfo | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function ImpersonateUserDialog({
  user,
  onOpenChange,
  onConfirm,
  isPending,
}: ImpersonateUserDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-warning/10 border-warning/20 flex size-14 items-center justify-center rounded-2xl border">
            <UserMinus className="text-warning size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">{t('admin.impersonate.title')}</AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('admin.impersonate.description', { name: user?.name || user?.email || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="bg-warning/10 mb-4 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="text-warning mb-1 font-medium">{t('admin.impersonate.warning')}</p>
              <p className="text-muted-foreground">{t('admin.impersonate.duration')}</p>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-warning text-warning-foreground hover:bg-warning/90 rounded-xl"
          >
            {t('admin.impersonate.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
