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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDisableTotp } from './use-two-factor';

interface DisableTwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisableTwoFactorDialog({
  open,
  onOpenChange,
}: DisableTwoFactorDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');

  const disableMutation = useDisableTotp({
    onSuccess: () => {
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
          <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <AlertTriangle className="size-7 text-destructive" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">
              {t('security.twoFactor.disableDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('security.twoFactor.disableDialog.description')}
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
            onClick={() => disableMutation.mutate(password)}
            disabled={!password || disableMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
          >
            {disableMutation.isPending && (
              <Loader2 className="size-4 animate-spin mr-2" />
            )}
            {t('security.twoFactor.disableDialog.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
