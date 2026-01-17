'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Fingerprint, Key, Loader2, Monitor, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRegisterPasskey } from './use-passkeys';

interface AddPasskeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPasskeyDialog({ open, onOpenChange }: AddPasskeyDialogProps) {
  const { t } = useTranslation();
  const [passkeyName, setPasskeyName] = useState('');

  const registerMutation = useRegisterPasskey({
    onSuccess: () => {
      onOpenChange(false);
      setPasskeyName('');
    },
  });

  const handleAddPasskey = () => {
    if (!passkeyName.trim()) {
      toast.error('Please enter a name for your passkey');
      return;
    }
    registerMutation.mutate(passkeyName.trim());
  };

  const handleClose = () => {
    onOpenChange(false);
    setPasskeyName('');
  };

  const suggestions = [
    { key: 'macbook', label: t('security.passkeys.addDialog.suggestions.macbook') },
    { key: 'iphone', label: t('security.passkeys.addDialog.suggestions.iphone') },
    { key: 'securityKey', label: t('security.passkeys.addDialog.suggestions.securityKey') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-w-[440px]">
        {/* Header with decorative background */}
        <div className="from-primary/20 via-primary/10 relative h-32 overflow-hidden bg-linear-to-br to-transparent">
          <div className="from-primary/30 absolute top-0 right-0 h-40 w-40 translate-x-1/4 -translate-y-1/2 rounded-full bg-linear-to-bl to-transparent blur-2xl" />
          <div className="from-warm/20 absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-linear-to-tr to-transparent blur-2xl" />
          <div
            className="absolute inset-0 opacity-3"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="bg-primary/40 absolute inset-0 scale-150 rounded-3xl blur-xl" />
              <div className="from-primary/30 via-primary/20 to-primary/10 border-primary/30 shadow-primary/20 relative flex size-20 items-center justify-center rounded-3xl border bg-linear-to-br shadow-lg backdrop-blur-sm">
                <Fingerprint className="text-primary size-10" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pt-6 pb-8">
          <div className="mb-8 text-center">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {t('security.passkeys.addDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
                {t('security.passkeys.addDialog.description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Name input */}
          <div className="mb-8 space-y-3">
            <label className="text-foreground/80 flex items-center gap-2 text-sm font-medium">
              <Key className="text-muted-foreground size-3.5" />
              {t('security.passkeys.addDialog.nameLabel')}
            </label>
            <div className="group relative">
              <Input
                placeholder={t('security.passkeys.addDialog.namePlaceholder')}
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPasskey()}
                autoFocus
                className="bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-card placeholder:text-muted-foreground/50 h-14 rounded-2xl pr-12 pl-5 text-base transition-all duration-200"
              />
              <div className="text-muted-foreground/40 group-focus-within:text-primary/60 absolute top-1/2 right-4 -translate-y-1/2 transition-colors">
                <Monitor className="size-5" />
              </div>
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.key}
                  type="button"
                  onClick={() => setPasskeyName(suggestion.label)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                    passkeyName === suggestion.label
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>

          {/* Security note */}
          <div className="from-muted/40 to-muted/20 border-border/40 mb-8 flex items-start gap-3 rounded-xl border bg-linear-to-br p-4">
            <div className="bg-primary/10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <ShieldCheck className="text-primary size-4" />
            </div>
            <div className="text-muted-foreground text-xs leading-relaxed">
              <span className="text-foreground/80 font-medium">
                {t('security.passkeys.addDialog.secureNote')}
              </span>
              <br />
              {t('security.passkeys.addDialog.secureNoteDescription')}
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-border/60 hover:bg-muted/50 h-12 flex-1 rounded-xl font-medium"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddPasskey}
              disabled={!passkeyName.trim() || registerMutation.isPending}
              className="shadow-primary/20 hover:shadow-primary/25 h-12 flex-1 gap-2 rounded-xl font-medium shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  {t('common.continue')}
                  <Fingerprint className="size-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
