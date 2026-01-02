'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
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
import { LogOut } from 'lucide-react';
import { useRevokeSession } from './use-sessions';

interface RevokeSessionDialogProps {
  sessionId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RevokeSessionDialog({
  sessionId,
  onOpenChange,
}: RevokeSessionDialogProps) {
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
        <div className="flex items-center gap-5 mb-4">
          <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <LogOut className="size-7 text-destructive" />
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
          <AlertDialogCancel className="rounded-xl">
            {t('common.cancel')}
          </AlertDialogCancel>
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
