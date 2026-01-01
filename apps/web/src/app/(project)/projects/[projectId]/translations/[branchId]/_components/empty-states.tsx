'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Loader2, Key, Plus } from 'lucide-react';

interface LoadingStateProps {
  className?: string;
}

export function LoadingState({ className }: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <div className={className ?? "py-16 text-center"}>
      <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">{t('translations.loading')}</p>
    </div>
  );
}

interface EmptyKeysStateProps {
  onCreateKey: () => void;
}

export function EmptyKeysState({ onCreateKey }: EmptyKeysStateProps) {
  const { t } = useTranslation();

  return (
    <div className="py-16 text-center">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Key className="size-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{t('translations.empty.title')}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {t('translations.empty.description')}
      </p>
      <Button onClick={onCreateKey} className="gap-2">
        <Plus className="h-4 w-4" />
        {t('translations.empty.createFirst')}
      </Button>
    </div>
  );
}

export function NoResultsState() {
  const { t } = useTranslation();

  return (
    <div className="py-12 text-center text-muted-foreground">
      {t('translations.noResults')}
    </div>
  );
}
