'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { AlertTriangle, Check, Copy, KeyRound, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
    <div className="animate-fade-in-up stagger-2 mb-8">
      <div className="island shadow-success/5 from-success/5 overflow-hidden border-0 bg-linear-to-br via-transparent to-transparent shadow-lg">
        <div className="from-success via-success/70 to-success/40 h-1 bg-linear-to-r" />
        <div className="p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="bg-success/30 absolute inset-0 rounded-2xl blur-lg" />
                <div className="from-success/20 to-success/5 border-success/20 relative flex size-14 items-center justify-center rounded-2xl border bg-linear-to-br">
                  <KeyRound className="text-success size-7" />
                </div>
              </div>
              <div>
                <h3 className="mb-0.5 text-lg font-semibold">{t('apiKeys.newKeyCreated')}</h3>
                <p className="text-muted-foreground text-sm">{t('apiKeys.copyKeyNow')}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted/50 size-10 shrink-0 rounded-xl"
              onClick={onDismiss}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="group relative">
            <code
              className="bg-muted/30 border-border/40 block rounded-2xl border p-5 pr-16 font-mono text-sm break-all"
              data-testid="new-api-key"
            >
              {apiKey}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="border-border/50 bg-card group-hover:border-success/30 absolute top-1/2 right-3 size-11 -translate-y-1/2 rounded-xl shadow-sm transition-colors"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="text-success size-5" /> : <Copy className="size-5" />}
            </Button>
          </div>

          <div className="bg-warning/5 border-warning/20 mt-5 flex items-center gap-3 rounded-xl border p-4">
            <AlertTriangle className="text-warning size-5 shrink-0" />
            <span className="text-muted-foreground text-sm">{t('apiKeys.storeSecurely')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
