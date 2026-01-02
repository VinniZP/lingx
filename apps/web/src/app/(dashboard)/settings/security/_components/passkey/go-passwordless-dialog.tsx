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
import { ShieldOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useGoPasswordless } from './use-passkeys';

interface GoPasswordlessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialsCount: number;
}

export function GoPasswordlessDialog({
  open,
  onOpenChange,
  credentialsCount,
}: GoPasswordlessDialogProps) {
  const { t } = useTranslation();

  const goPasswordlessMutation = useGoPasswordless({
    onSuccess: () => onOpenChange(false),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="flex items-center gap-5 mb-4">
          <div className="size-14 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20">
            <ShieldOff className="size-7 text-warning" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">
              {t('security.passkeys.passwordlessDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('security.passkeys.passwordlessDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-success/5 border border-success/20">
            <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t('security.passkeys.passwordlessDialog.passkeyCount', {
                count: credentialsCount,
              })}
            </p>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-warning/5 border border-warning/20">
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t('security.passkeys.passwordlessDialog.warning')}
            </p>
          </div>
        </div>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl">
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => goPasswordlessMutation.mutate()}
            disabled={goPasswordlessMutation.isPending}
            className="rounded-xl"
          >
            {goPasswordlessMutation.isPending && (
              <Loader2 className="size-4 animate-spin mr-2" />
            )}
            {t('security.passkeys.passwordlessDialog.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
