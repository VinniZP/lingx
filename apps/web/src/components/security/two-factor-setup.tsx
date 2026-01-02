'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from '@lingx/sdk-nextjs';
import { totpApi, ApiError, TotpSetupResponse } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  KeyRound,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Step = 'intro' | 'qrcode' | 'verify' | 'backup';

const STEPS: Step[] = ['intro', 'qrcode', 'verify', 'backup'];

export function TwoFactorSetup({ open, onOpenChange, onComplete }: TwoFactorSetupProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('intro');
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('intro');
      setSetupData(null);
      setQrCodeDataUrl('');
      setCode(['', '', '', '', '', '']);
      setError(null);
      setBackupCodesAcknowledged(false);
      setCopiedSecret(false);
    }
  }, [open]);

  // Focus first code input when on verify step
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await totpApi.initiateSetup();
      setSetupData(data);

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(data.qrCodeUri, {
        width: 220,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qrUrl);

      setStep('qrcode');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('twoFactorSetup.failedToStart'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeToVerify = fullCode || code.join('');
    if (codeToVerify.length !== 6) {
      setError(t('twoFactor.enterAllDigits'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await totpApi.confirmSetup(codeToVerify);
      setStep('backup');
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrorMsg = err.fieldErrors?.[0]?.message;
        setError(fieldErrorMsg || err.message);
      } else {
        setError(t('twoFactor.verificationFailed'));
      }
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast.success(t('twoFactorSetup.secretCopied'));
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `${t('twoFactorSetup.backupCodesFile.title')}
========================
${t('twoFactorSetup.backupCodesFile.generated')}: ${new Date().toLocaleString()}

${t('twoFactorSetup.backupCodesFile.description')}
${t('twoFactorSetup.backupCodesFile.oneTimeUse')}

${setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

${t('twoFactorSetup.backupCodesFile.keepSafe')}
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
    toast.success(t('twoFactorSetup.backupCodesDownloaded'));
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
    toast.success(t('twoFactorSetup.enabled'));
  };

  const handleCancel = async () => {
    if (setupData && step !== 'backup') {
      try {
        await totpApi.cancelSetup();
      } catch {
        // Ignore errors
      }
    }
    onOpenChange(false);
  };

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0" showCloseButton={false}>
        {/* Progress header */}
        <div className="px-6 pt-6 pb-2">
          {/* Simple step indicator */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'size-2 rounded-full transition-all',
                    i < currentStepIndex
                      ? 'bg-primary'
                      : i === currentStepIndex
                        ? 'bg-primary ring-4 ring-primary/20'
                        : 'bg-muted'
                  )}
                />
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'w-8 h-px',
                    i < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  )} />
                )}
              </div>
            ))}
          </div>

          <DialogHeader>
            <DialogTitle className="text-xl">
              {step === 'intro' && t('twoFactorSetup.title.intro')}
              {step === 'qrcode' && t('twoFactorSetup.title.qrcode')}
              {step === 'verify' && t('twoFactorSetup.title.verify')}
              {step === 'backup' && t('twoFactorSetup.title.backup')}
            </DialogTitle>
            <DialogDescription>
              {step === 'intro' && t('twoFactorSetup.description.intro')}
              {step === 'qrcode' && t('twoFactorSetup.description.qrcode')}
              {step === 'verify' && t('twoFactorSetup.description.verify')}
              {step === 'backup' && t('twoFactorSetup.description.backup')}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mb-4 flex items-center gap-2.5 text-destructive bg-destructive/10 rounded-xl p-3 border border-destructive/20">
            <AlertCircle className="size-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="px-6 pb-5">
          {/* Step: Intro */}
          {step === 'intro' && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  {
                    icon: Smartphone,
                    title: t('twoFactorSetup.steps.downloadApp.title'),
                    description: t('twoFactorSetup.steps.downloadApp.description'),
                  },
                  {
                    icon: QrCode,
                    title: t('twoFactorSetup.steps.scanQr.title'),
                    description: t('twoFactorSetup.steps.scanQr.description'),
                  },
                  {
                    icon: KeyRound,
                    title: t('twoFactorSetup.steps.saveBackup.title'),
                    description: t('twoFactorSetup.steps.saveBackup.description'),
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 group hover:bg-muted/50 transition-colors"
                  >
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <item.icon className="size-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm leading-tight">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-tight">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleStartSetup} disabled={isLoading} className="flex-1 gap-2">
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      {t('twoFactorSetup.getStarted')}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step: QR Code */}
          {step === 'qrcode' && setupData && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="relative p-1 rounded-2xl bg-linear-to-br from-primary/20 via-primary/10 to-warm/10">
                  <div className="bg-white p-4 rounded-xl">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="QR Code" className="size-48 sm:size-52" />
                    ) : (
                      <div className="size-48 sm:size-52 flex items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {t('twoFactorSetup.cantScan')}
                </p>
                <div className="inline-flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5 border border-border/50">
                  <code className="font-mono text-sm tracking-wider font-medium">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySecret}
                    className="h-7 w-7 p-0"
                  >
                    {copiedSecret ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => setStep('verify')} className="flex-1 gap-2">
                  {t('twoFactorSetup.iveScannedIt')}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Verify */}
          {step === 'verify' && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="flex gap-2" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={cn(
                        'size-12 sm:size-14 text-center text-2xl font-semibold rounded-xl border-2 outline-none transition-all',
                        'bg-card focus:border-primary focus:ring-4 focus:ring-primary/10',
                        digit ? 'border-primary/50' : 'border-border'
                      )}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {t('twoFactorSetup.enterCodeFromApp')}
              </p>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep('qrcode')} className="flex-1 gap-2">
                  <ArrowLeft className="size-4" />
                  {t('common.back')}
                </Button>
                <Button
                  onClick={() => handleVerify()}
                  disabled={isLoading || code.join('').length !== 6}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t('twoFactorSetup.verifyCode')
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Backup Codes */}
          {step === 'backup' && setupData && (
            <div className="space-y-5">
              {/* Success banner */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                <div className="size-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <ShieldCheck className="size-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-success text-sm">{t('twoFactorSetup.successBanner.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('twoFactorSetup.successBanner.description')}</p>
                </div>
              </div>

              {/* Backup codes */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="bg-card px-3 py-2.5 rounded-lg font-mono text-sm text-center border border-border/50 tracking-wider"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={downloadBackupCodes}
                className="w-full gap-2"
              >
                <Download className="size-4" />
                {t('twoFactorSetup.downloadBackupCodes')}
              </Button>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={backupCodesAcknowledged}
                  onCheckedChange={(checked) => setBackupCodesAcknowledged(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {t('twoFactorSetup.acknowledgement')}
                </span>
              </label>

              <Button
                onClick={handleComplete}
                disabled={!backupCodesAcknowledged}
                className="w-full h-11 gap-2"
              >
                <CheckCircle2 className="size-4" />
                {t('twoFactorSetup.completeSetup')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
