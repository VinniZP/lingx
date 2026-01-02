'use client';

import { useState } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Fingerprint, Key, Monitor, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      <DialogContent className="border-0 shadow-2xl sm:max-w-[440px] p-0 overflow-hidden gap-0">
        {/* Header with decorative background */}
        <div className="relative h-32 bg-linear-to-br from-primary/20 via-primary/10 to-transparent overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-linear-to-bl from-primary/30 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-linear-to-tr from-warm/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div
            className="absolute inset-0 opacity-3"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/40 rounded-3xl blur-xl scale-150" />
              <div className="relative size-20 rounded-3xl bg-linear-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center border border-primary/30 backdrop-blur-sm shadow-lg shadow-primary/20">
                <Fingerprint className="size-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-6">
          <div className="text-center mb-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {t('security.passkeys.addDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                {t('security.passkeys.addDialog.description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Name input */}
          <div className="space-y-3 mb-8">
            <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              <Key className="size-3.5 text-muted-foreground" />
              {t('security.passkeys.addDialog.nameLabel')}
            </label>
            <div className="relative group">
              <Input
                placeholder={t('security.passkeys.addDialog.namePlaceholder')}
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPasskey()}
                autoFocus
                className="h-14 rounded-2xl pl-5 pr-12 text-base bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-card transition-all duration-200 placeholder:text-muted-foreground/50"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors">
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
                    'px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200',
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
          <div className="flex items-start gap-3 p-4 rounded-xl bg-linear-to-br from-muted/40 to-muted/20 border border-border/40 mb-8">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground/80">
                {t('security.passkeys.addDialog.secureNote')}
              </span>
              <br />
              {t('security.passkeys.addDialog.secureNoteDescription')}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12 rounded-xl border-border/60 hover:bg-muted/50 font-medium"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddPasskey}
              disabled={!passkeyName.trim() || registerMutation.isPending}
              className="flex-1 h-12 rounded-xl font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 gap-2"
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
