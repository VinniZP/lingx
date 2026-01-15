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
import { PasswordInput } from '@/components/ui/password-input';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useRegenerateBackupCodes } from './use-two-factor';

interface RegenerateCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodesGenerated: (codes: string[]) => void;
}

export function RegenerateCodesDialog({
  open,
  onOpenChange,
  onCodesGenerated,
}: RegenerateCodesDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');

  const regenerateMutation = useRegenerateBackupCodes({
    onSuccess: (codes) => {
      onCodesGenerated(codes);
      onOpenChange(false);
      setPassword('');
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPassword('');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="border-0 shadow-2xl">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-warning/10 border-warning/20 flex size-14 items-center justify-center rounded-2xl border">
            <RefreshCw className="text-warning size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">
              {t('security.twoFactor.regenerateDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('security.twoFactor.regenerateDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <div className="py-4">
          <label className="mb-2.5 block text-sm font-medium">
            {t('security.twoFactor.disableDialog.confirmPassword')}
          </label>
          <PasswordInput
            placeholder={t('security.changePassword.currentPasswordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => regenerateMutation.mutate(password)}
            disabled={!password || regenerateMutation.isPending}
            className="rounded-xl"
          >
            {regenerateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('security.twoFactor.regenerateDialog.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
