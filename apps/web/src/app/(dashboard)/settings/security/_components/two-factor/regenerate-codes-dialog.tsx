'use client';

import { useState } from 'react';
import { useTranslation } from '@localeflow/sdk-nextjs';
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
import { RefreshCw, Loader2 } from 'lucide-react';
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
        <div className="flex items-center gap-5 mb-4">
          <div className="size-14 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20">
            <RefreshCw className="size-7 text-warning" />
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
          <label className="text-sm font-medium mb-2.5 block">
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
          <AlertDialogCancel className="rounded-xl">
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => regenerateMutation.mutate(password)}
            disabled={!password || regenerateMutation.isPending}
            className="rounded-xl"
          >
            {regenerateMutation.isPending && (
              <Loader2 className="size-4 animate-spin mr-2" />
            )}
            {t('security.twoFactor.regenerateDialog.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
