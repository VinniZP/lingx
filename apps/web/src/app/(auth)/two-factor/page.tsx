'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TwoFactorPage() {
  const router = useRouter();
  const { pendingTwoFactor, verifyTwoFactor, verifyBackupCode, cancelTwoFactor } = useAuth();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no pending 2FA
  useEffect(() => {
    if (!pendingTwoFactor) {
      router.push('/login');
    }
  }, [pendingTwoFactor, router]);

  // Focus first input on mount
  useEffect(() => {
    if (!useBackupCode) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [useBackupCode]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
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
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    setError(null);
    setIsLoading(true);

    try {
      if (useBackupCode) {
        const codesRemaining = await verifyBackupCode(backupCode.toUpperCase(), trustDevice);
        if (codesRemaining <= 2) {
          toast.warning(`Only ${codesRemaining} backup codes remaining. Consider regenerating them.`);
        } else {
          toast.success('Welcome back!');
        }
      } else {
        const codeToVerify = fullCode || code.join('');
        if (codeToVerify.length !== 6) {
          setError('Please enter all 6 digits');
          setIsLoading(false);
          return;
        }
        await verifyTwoFactor(codeToVerify, trustDevice);
        toast.success('Welcome back!');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        // Get the first field error message or fall back to main error message
        const fieldErrorMsg = err.fieldErrors?.[0]?.message;
        setError(fieldErrorMsg || err.message);
      } else {
        setError('Verification failed. Please try again.');
      }
      // Reset code on error
      if (!useBackupCode) {
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!pendingTwoFactor) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-8">
      {/* Back to login */}
      <button
        onClick={cancelTwoFactor}
        className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        <span>Back to login</span>
      </button>

      {/* Header */}
      <div className="space-y-3">
        <h1
          className="text-[2rem] font-semibold tracking-tight text-foreground"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          {useBackupCode ? 'Backup code' : 'Two-factor authentication'}
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          {useBackupCode
            ? 'Enter one of your backup codes to sign in'
            : 'Enter the 6-digit code from your authenticator app'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2.5 text-destructive bg-destructive/10 rounded-xl p-3 border border-destructive/20">
          <AlertCircle className="size-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Code input */}
      <div className="space-y-5">
        {useBackupCode ? (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Backup code
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                <KeyRound className="w-[18px] h-[18px]" />
              </div>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => {
                  setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
                  setError(null);
                }}
                placeholder="XXXXXXXX"
                className="h-12 w-full pl-12 pr-4 bg-card border border-border/60 rounded-xl text-[15px] font-mono tracking-widest placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all duration-200"
                autoFocus
                disabled={isLoading}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Verification code
            </label>
            <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
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
                    'size-12 sm:size-14 text-center text-xl sm:text-2xl font-semibold rounded-xl border outline-none transition-all duration-200',
                    'bg-card focus:border-primary focus:ring-2 focus:ring-primary/10',
                    digit ? 'border-primary/50' : 'border-border/60'
                  )}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Trust device checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            checked={trustDevice}
            onCheckedChange={(checked) => setTrustDevice(checked === true)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
              Remember this device
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Skip 2FA for 30 days on this device
            </p>
          </div>
        </label>

        {/* Submit button */}
        <Button
          onClick={() => handleSubmit()}
          disabled={isLoading || (useBackupCode ? backupCode.length !== 8 : code.join('').length !== 6)}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[15px] transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify & Sign In
              <ArrowRight className="ml-2 h-[18px] w-[18px]" />
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            {useBackupCode ? 'Have your app?' : 'Lost access?'}
          </span>
        </div>
      </div>

      {/* Toggle between TOTP and backup code */}
      <div className="text-center">
        <button
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setError(null);
            setCode(['', '', '', '', '', '']);
            setBackupCode('');
          }}
          className="group inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium text-foreground rounded-xl border border-border/60 bg-card hover:bg-accent hover:border-border transition-all duration-200"
        >
          {useBackupCode ? (
            <>
              Use authenticator app
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Use a backup code
            </>
          )}
        </button>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-muted-foreground">
        Having trouble?{' '}
        <Link href="/help" className="text-primary hover:underline font-medium">
          Get help
        </Link>
      </p>
    </div>
  );
}
