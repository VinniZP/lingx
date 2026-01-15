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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { formatDistanceToNow } from 'date-fns';
import { ShieldCheck, Trash2 } from 'lucide-react';

interface ApiKeyRowProps {
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    lastUsedAt: string | null;
    createdAt: string;
  };
  onRevoke: () => void;
  isRevoking: boolean;
}

export function ApiKeyRow({ apiKey, onRevoke, isRevoking }: ApiKeyRowProps) {
  const { t } = useTranslation();

  return (
    <div className="group hover:bg-muted/20 flex items-center gap-5 p-5 transition-colors">
      <div className="from-success/15 to-success/5 border-success/20 flex size-12 shrink-0 items-center justify-center rounded-xl border bg-linear-to-br">
        <ShieldCheck className="text-success size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <p className="truncate font-semibold">{apiKey.name}</p>
          <span className="bg-success/15 text-success border-success/20 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
            {t('apiKeys.stats.active')}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <code className="text-muted-foreground bg-muted/30 rounded-md px-2 py-0.5 font-mono text-xs">
            {apiKey.keyPrefix}...
          </code>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            · {t('apiKeys.lastUsed')}{' '}
            {apiKey.lastUsedAt
              ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })
              : t('apiKeys.never')}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-muted-foreground hidden text-xs lg:block">
          {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-10 rounded-xl"
              data-testid="revoke-key-button"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">
                {t('apiKeys.revokeDialog.title')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground leading-relaxed">
                This will permanently revoke the API key{' '}
                <strong className="text-foreground">{apiKey.name}</strong>. Any applications using
                this key will no longer be able to authenticate. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2 gap-3">
              <AlertDialogCancel className="h-12 rounded-xl">
                {t('apiKeys.revokeDialog.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onRevoke}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20 h-12 rounded-xl shadow-lg"
              >
                {isRevoking
                  ? t('apiKeys.revokeDialog.revoking')
                  : t('apiKeys.revokeDialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
