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
import { AlertTriangle, CheckCircle2, Loader2, ShieldOff } from 'lucide-react';
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
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-warning/10 border-warning/20 flex size-14 items-center justify-center rounded-2xl border">
            <ShieldOff className="text-warning size-7" />
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

        <div className="space-y-3 py-4">
          <div className="bg-success/5 border-success/20 flex items-start gap-4 rounded-xl border p-4">
            <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" />
            <p className="text-muted-foreground text-sm">
              {t('security.passkeys.passwordlessDialog.passkeyCount', {
                count: credentialsCount,
              })}
            </p>
          </div>
          <div className="bg-warning/5 border-warning/20 flex items-start gap-4 rounded-xl border p-4">
            <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
            <p className="text-muted-foreground text-sm">
              {t('security.passkeys.passwordlessDialog.warning')}
            </p>
          </div>
        </div>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => goPasswordlessMutation.mutate()}
            disabled={goPasswordlessMutation.isPending}
            className="rounded-xl"
          >
            {goPasswordlessMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('security.passkeys.passwordlessDialog.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
