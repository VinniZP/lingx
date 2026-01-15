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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useDisableTotp } from './use-two-factor';

interface DisableTwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisableTwoFactorDialog({ open, onOpenChange }: DisableTwoFactorDialogProps) {
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
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-destructive/10 border-destructive/20 flex size-14 items-center justify-center rounded-2xl border">
            <AlertTriangle className="text-destructive size-7" />
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
            onClick={() => disableMutation.mutate(password)}
            disabled={!password || disableMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
          >
            {disableMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('security.twoFactor.disableDialog.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
