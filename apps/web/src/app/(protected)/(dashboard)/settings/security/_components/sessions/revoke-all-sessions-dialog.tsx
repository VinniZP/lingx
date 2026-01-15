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
import { LogOut } from 'lucide-react';
import { useRevokeAllSessions } from './use-sessions';

interface RevokeAllSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionCount: number;
}

export function RevokeAllSessionsDialog({
  open,
  onOpenChange,
  sessionCount,
}: RevokeAllSessionsDialogProps) {
  const { t } = useTranslation();

  const revokeAllMutation = useRevokeAllSessions({
    onSuccess: () => onOpenChange(false),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-destructive/10 border-destructive/20 flex size-14 items-center justify-center rounded-2xl border">
            <LogOut className="text-destructive size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">
              {t('security.activeSessions.revokeAllSessions')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('security.activeSessions.revokeAllConfirm', {
                count: sessionCount,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => revokeAllMutation.mutate()}
            disabled={revokeAllMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
          >
            {t('security.activeSessions.revokeAllSessions')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
