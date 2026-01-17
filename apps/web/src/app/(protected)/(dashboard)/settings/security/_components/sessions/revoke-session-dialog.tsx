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
import { useRevokeSession } from './use-sessions';

interface RevokeSessionDialogProps {
  sessionId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RevokeSessionDialog({ sessionId, onOpenChange }: RevokeSessionDialogProps) {
  const { t } = useTranslation();

  const revokeMutation = useRevokeSession({
    onSuccess: () => onOpenChange(false),
  });

  const handleRevoke = () => {
    if (sessionId) {
      revokeMutation.mutate(sessionId);
    }
  };

  return (
    <AlertDialog open={!!sessionId} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-destructive/10 border-destructive/20 flex size-14 items-center justify-center rounded-2xl border">
            <LogOut className="text-destructive size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">
              {t('security.activeSessions.revokeSession')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('security.activeSessions.revokeConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
          >
            {t('security.activeSessions.revokeSession')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
