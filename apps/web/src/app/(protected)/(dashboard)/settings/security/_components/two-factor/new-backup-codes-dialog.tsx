'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface NewBackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codes: string[] | null;
  onClose: () => void;
}

export function NewBackupCodesDialog({
  open,
  onOpenChange,
  codes,
  onClose,
}: NewBackupCodesDialogProps) {
  const { t } = useTranslation();

  const handleDownload = () => {
    if (!codes) return;

    const content = `Lingx Backup Codes
========================
Generated: ${new Date().toLocaleString()}

These codes can be used to sign in if you lose access to your authenticator app.
Each code can only be used once.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Keep these codes in a safe place!
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lingx-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('security.twoFactor.codesDownloaded'));
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-0 shadow-2xl sm:max-w-lg">
        <div className="mb-4 flex items-center gap-5">
          <div className="bg-success/10 border-success/20 flex size-14 items-center justify-center rounded-2xl border">
            <CheckCircle2 className="text-success size-7" />
          </div>
          <AlertDialogHeader className="flex-1 p-0">
            <AlertDialogTitle className="text-xl">
              {t('security.twoFactor.newCodesDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {t('security.twoFactor.newCodesDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <div className="py-4">
          <div className="bg-muted/30 border-border/40 rounded-2xl border p-5">
            <div className="grid grid-cols-2 gap-3">
              {codes?.map((code, i) => (
                <code
                  key={i}
                  className="bg-card border-border/50 rounded-xl border px-4 py-3 text-center font-mono text-sm font-medium tracking-widest"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="mt-5 h-12 w-full gap-2.5 rounded-xl"
          >
            <Download className="size-4" />
            {t('security.twoFactor.newCodesDialog.download')}
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose} className="rounded-xl">
            {t('security.twoFactor.newCodesDialog.saved')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
