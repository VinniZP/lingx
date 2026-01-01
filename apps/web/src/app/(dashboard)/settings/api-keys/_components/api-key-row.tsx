'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
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
import { ShieldCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    <div className="p-5 flex items-center gap-5 group hover:bg-muted/20 transition-colors">
      <div className="size-12 rounded-xl bg-linear-to-br from-success/15 to-success/5 flex items-center justify-center shrink-0 border border-success/20">
        <ShieldCheck className="size-5 text-success" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <p className="font-semibold truncate">{apiKey.name}</p>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
            {t('apiKeys.stats.active')}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <code className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-md">
            {apiKey.keyPrefix}...
          </code>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            · {t('apiKeys.lastUsed')}{' '}
            {apiKey.lastUsedAt
              ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })
              : t('apiKeys.never')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground hidden lg:block">
          {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              data-testid="revoke-key-button"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-0 shadow-2xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">
                {t('apiKeys.revokeDialog.title')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground leading-relaxed">
                This will permanently revoke the API key{' '}
                <strong className="text-foreground">{apiKey.name}</strong>. Any
                applications using this key will no longer be able to
                authenticate. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-2">
              <AlertDialogCancel className="h-12 rounded-xl">
                {t('apiKeys.revokeDialog.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onRevoke}
                className="h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20"
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
