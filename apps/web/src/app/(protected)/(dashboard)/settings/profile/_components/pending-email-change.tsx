'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { AlertCircle, X } from 'lucide-react';

interface PendingEmailChangeProps {
  newEmail: string;
  onCancel: () => void;
}

export function PendingEmailChange({ newEmail, onCancel }: PendingEmailChangeProps) {
  const { t } = useTranslation();

  return (
    <div className="island shadow-warning/3 border-warning/30 from-warning/5 overflow-hidden border-0 bg-linear-to-br to-transparent shadow-lg">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="bg-warning/10 border-warning/20 flex size-12 shrink-0 items-center justify-center rounded-2xl border">
            <AlertCircle className="text-warning size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('profile.emailChangePending')}</p>
            <p className="text-muted-foreground mt-1 truncate text-sm">
              {t('profile.verificationSentTo')}{' '}
              <span className="text-foreground font-medium">{newEmail}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-4 h-10 gap-2 rounded-xl text-xs font-medium"
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
