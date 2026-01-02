'use client';

import { useState } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { KeyRound, X, Copy, Check, AlertTriangle } from 'lucide-react';

interface NewKeyAlertProps {
  apiKey: string;
  onDismiss: () => void;
}

export function NewKeyAlert({ apiKey, onDismiss }: NewKeyAlertProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success(t('apiKeys.copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('apiKeys.copyFailed'));
    }
  };

  return (
    <div className="mb-8 animate-fade-in-up stagger-2">
      <div className="island overflow-hidden border-0 shadow-lg shadow-success/5 bg-linear-to-br from-success/5 via-transparent to-transparent">
        <div className="h-1 bg-linear-to-r from-success via-success/70 to-success/40" />
        <div className="p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-success/30 rounded-2xl blur-lg" />
                <div className="relative size-14 rounded-2xl bg-linear-to-br from-success/20 to-success/5 flex items-center justify-center border border-success/20">
                  <KeyRound className="size-7 text-success" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-0.5">
                  {t('apiKeys.newKeyCreated')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('apiKeys.copyKeyNow')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-xl hover:bg-muted/50"
              onClick={onDismiss}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="relative group">
            <code
              className="block p-5 bg-muted/30 rounded-2xl border border-border/40 font-mono text-sm break-all pr-16"
              data-testid="new-api-key"
            >
              {apiKey}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-11 rounded-xl border-border/50 bg-card shadow-sm group-hover:border-success/30 transition-colors"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="size-5 text-success" />
              ) : (
                <Copy className="size-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3 mt-5 p-4 rounded-xl bg-warning/5 border border-warning/20">
            <AlertTriangle className="size-5 text-warning shrink-0" />
            <span className="text-sm text-muted-foreground">
              {t('apiKeys.storeSecurely')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
