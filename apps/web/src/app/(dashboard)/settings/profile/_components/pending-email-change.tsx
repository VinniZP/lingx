'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';

interface PendingEmailChangeProps {
  newEmail: string;
  onCancel: () => void;
}

export function PendingEmailChange({ newEmail, onCancel }: PendingEmailChangeProps) {
  const { t } = useTranslation();

  return (
    <div className="island overflow-hidden border-0 shadow-lg shadow-warning/3 border-warning/30 bg-linear-to-br from-warning/5 to-transparent">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0 border border-warning/20">
            <AlertCircle className="size-6 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{t('profile.emailChangePending')}</p>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {t('profile.verificationSentTo')}{' '}
              <span className="font-medium text-foreground">{newEmail}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 h-10 rounded-xl text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={onCancel}
            >
              <X className="size-4" />
              {t('profile.cancelEmailChange')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
