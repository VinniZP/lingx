'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
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

    const content = `LocaleFlow Backup Codes
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
    a.download = 'localeflow-backup-codes.txt';
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
      <AlertDialogContent className="sm:max-w-lg border-0 shadow-2xl">
        <div className="flex items-center gap-5 mb-4">
          <div className="size-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
            <CheckCircle2 className="size-7 text-success" />
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
          <div className="bg-muted/30 rounded-2xl p-5 border border-border/40">
            <div className="grid grid-cols-2 gap-3">
              {codes?.map((code, i) => (
                <code
                  key={i}
                  className="bg-card px-4 py-3 rounded-xl font-mono text-sm text-center border border-border/50 tracking-widest font-medium"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="w-full mt-5 gap-2.5 h-12 rounded-xl"
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
