'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { useAuth } from '@/lib/auth';
import { securityApi, totpApi, webauthnApi, type Session, type WebAuthnCredential } from '@/lib/api';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { TwoFactorSetup } from '@/components/security/two-factor-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Lock,
  Loader2,
  ArrowLeft,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Fingerprint,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  Plus,
  Key,
  ShieldOff,
  Sparkles,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { passwordSchema } from '@localeflow/shared';

// ============================================
// Validation Schemas
// ============================================

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

// ============================================
// Security Score Calculator
// ============================================

function useSecurityScore() {
  const supportsPasskey = typeof window !== 'undefined' && browserSupportsWebAuthn();

  const { data: totpStatus } = useQuery({
    queryKey: ['totp-status'],
    queryFn: () => totpApi.getStatus(),
  });

  const { data: webauthnStatus } = useQuery({
    queryKey: ['webauthn-status'],
    queryFn: () => webauthnApi.getStatus(),
    enabled: supportsPasskey,
  });

  // Calculate security score out of 100
  let score = 40; // Base score for having a password
  let maxScore = 100;

  if (totpStatus?.enabled) score += 30;
  if (webauthnStatus?.hasPasskeys) score += 20;
  if (webauthnStatus?.isPasswordless) score += 10;

  const percentage = Math.round((score / maxScore) * 100);
  const level = percentage >= 90 ? 'Excellent' : percentage >= 70 ? 'Strong' : percentage >= 50 ? 'Moderate' : 'Needs Improvement';
  const color = percentage >= 90 ? 'text-success' : percentage >= 70 ? 'text-primary' : percentage >= 50 ? 'text-warning' : 'text-destructive';

  return { score, maxScore, percentage, level, color };
}

// ============================================
// Main Security Page
// ============================================

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const { isManager, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.push('/projects');
    }
  }, [isManager, authLoading, router]);

  if (authLoading) {
    return <LoadingState />;
  }

  if (!isManager) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-16">
      {/* Premium atmospheric backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-bl from-primary/[0.08] via-primary/[0.04] to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 animate-pulse" style={{ animationDuration: '8s' }} />
        {/* Warm accent orb */}
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-to-tr from-warm/[0.06] via-warm/[0.02] to-transparent rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        {/* Floating accent orb */}
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-r from-success/[0.04] to-primary/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '12s' }} />
        {/* Refined grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Back navigation - refined with better hover state */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 group mb-12 animate-fade-in-up"
      >
        <div className="size-9 rounded-xl bg-card border border-border/50 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300 shadow-sm">
          <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </div>
        <span className="font-medium tracking-tight">{t('settings.backToSettings')}</span>
      </Link>

      {/* Premium Page Header with Security Score */}
      <div className="relative mb-12 animate-fade-in-up stagger-1">
        <div className="island overflow-hidden border-0 shadow-lg shadow-primary/[0.03]">
          {/* Gradient accent band */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-warm" />

          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              {/* Icon with premium glow effect */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary/25 rounded-3xl blur-2xl scale-110" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-warm/20 rounded-3xl blur-xl" />
                <div className="relative size-20 lg:size-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-warm/5 flex items-center justify-center border border-primary/20 backdrop-blur-sm">
                  <Shield className="size-10 lg:size-12 text-primary" />
                  <Sparkles className="absolute -top-1 -right-1 size-5 text-primary animate-pulse" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                    {t('security.title')}
                  </h1>
                </div>
                <p className="text-muted-foreground text-base lg:text-lg max-w-xl leading-relaxed">
                  {t('security.description')}
                </p>
              </div>

              {/* Security Score Widget */}
              <SecurityScoreWidget />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:gap-10 lg:grid-cols-12">
        {/* Left Column - Main Security Features */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Two-Factor Authentication Card */}
          <section className="animate-fade-in-up stagger-2">
            <TwoFactorCard />
          </section>

          {/* Passkeys Card */}
          <section className="animate-fade-in-up stagger-3">
            <PasskeyCard />
          </section>

          {/* Password Change Card */}
          <section className="animate-fade-in-up stagger-4">
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              {/* Section header with subtle gradient */}
              <div className="px-8 py-6 border-b border-border/40 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                    <Lock className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{t('security.changePassword.title')}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{t('security.changePassword.description')}</p>
                  </div>
                </div>
              </div>
              <PasswordChangeForm />
            </div>
          </section>
        </div>

        {/* Right Column - Sessions & Status */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
          {/* Active Sessions */}
          <section className="animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Activity className="size-3.5 text-muted-foreground" />
                </div>
                {t('security.activeSessions.title')}
              </h3>
            </div>
            <SessionsList />
          </section>

          {/* Security Checklist */}
          <section className="animate-fade-in-up stagger-6">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-success/10 flex items-center justify-center">
                  <ShieldCheck className="size-3.5 text-success" />
                </div>
                {t('security.securityChecklist')}
              </h3>
            </div>
            <SecurityChecklist />
          </section>

          {/* Security Tips */}
          <section className="animate-fade-in-up stagger-6">
            <SecurityTips />
          </section>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Security Score Widget
// ============================================

function SecurityScoreWidget() {
  const { t } = useTranslation();
  const { percentage, level, color } = useSecurityScore();

  return (
    <div className="shrink-0 p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 min-w-[180px]">
      <div className="text-center">
        <div className="relative inline-flex">
          {/* Circular progress background */}
          <svg className="size-20 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={color}
              strokeDasharray={`${percentage * 2.64} 264`}
              style={{ transition: 'stroke-dasharray 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-xl font-bold tabular-nums', color)}>
              {percentage}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <p className={cn('text-sm font-semibold', color)}>{level}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('security.securityScore')}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Two-Factor Authentication Card
// ============================================

function TwoFactorCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['totp-status'],
    queryFn: () => totpApi.getStatus(),
  });

  const disableMutation = useMutation({
    mutationFn: totpApi.disable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-status'] });
      toast.success('Two-factor authentication disabled');
      setDisableDialogOpen(false);
      setPassword('');
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to disable 2FA');
      }
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: totpApi.regenerateBackupCodes,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['totp-status'] });
      setNewBackupCodes(data.backupCodes);
      setRegenerateDialogOpen(false);
      setPassword('');
      setShowBackupCodes(true);
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to regenerate backup codes');
      }
    },
  });

  const handleSetupComplete = () => {
    refetch();
  };

  const downloadBackupCodes = () => {
    if (!newBackupCodes) return;

    const content = `LocaleFlow Backup Codes
========================
Generated: ${new Date().toLocaleString()}

These codes can be used to sign in if you lose access to your authenticator app.
Each code can only be used once.

${newBackupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

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
    toast.success('Backup codes downloaded');
  };

  if (isLoading) {
    return (
      <div className="island p-10 border-0 shadow-lg shadow-black/[0.02]">
        <div className="flex items-center gap-5 animate-pulse">
          <div className="size-16 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-72 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
        {/* Status banner with gradient */}
        <div className={cn(
          'px-8 py-5 flex items-center gap-5 border-b',
          status?.enabled
            ? 'bg-gradient-to-r from-success/12 via-success/6 to-transparent border-success/20'
            : 'bg-gradient-to-r from-warning/12 via-warning/6 to-transparent border-warning/20'
        )}>
          <div className={cn(
            'size-14 rounded-2xl flex items-center justify-center shadow-sm',
            status?.enabled
              ? 'bg-gradient-to-br from-success/20 to-success/5 border border-success/20'
              : 'bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/20'
          )}>
            {status?.enabled ? (
              <ShieldCheck className="size-7 text-success" />
            ) : (
              <ShieldAlert className="size-7 text-warning" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-xl tracking-tight">{t('security.twoFactor.title')}</span>
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full',
                status?.enabled
                  ? 'bg-success/15 text-success border border-success/20'
                  : 'bg-warning/15 text-warning border border-warning/20'
              )}>
                {status?.enabled ? t('security.twoFactor.active') : t('security.twoFactor.inactive')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {status?.enabled
                ? t('security.twoFactor.activeDescription')
                : t('security.twoFactor.inactiveDescription')}
            </p>
          </div>
        </div>

        <div className="p-8">
          {status?.enabled ? (
            <div className="space-y-6">
              {/* Status metrics with premium styling */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('security.twoFactor.backupCodes')}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-3xl font-bold tabular-nums tracking-tight',
                      status.backupCodesRemaining <= 2 ? 'text-warning' : 'text-foreground'
                    )}>
                      {status.backupCodesRemaining}
                    </span>
                    <span className="text-sm text-muted-foreground">remaining</span>
                  </div>
                  {status.backupCodesRemaining <= 2 && (
                    <p className="text-xs text-warning mt-3 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="size-3.5" />
                      Consider regenerating
                    </p>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40">
                  <div className="flex items-center gap-2 mb-3">
                    <Monitor className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('security.twoFactor.trustedDevices')}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums tracking-tight">
                      {status.trustedDevicesCount}
                    </span>
                    <span className="text-sm text-muted-foreground">devices</span>
                  </div>
                </div>
              </div>

              {/* Actions with refined styling */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRegenerateDialogOpen(true)}
                  className="flex-1 gap-2.5 h-12 rounded-xl border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                >
                  <RefreshCw className="size-4" />
                  {t('security.twoFactor.regenerateCodes')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDisableDialogOpen(true)}
                  className="flex-1 gap-2.5 h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                >
                  <Trash2 className="size-4" />
                  {t('security.twoFactor.disable')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Benefits list with icons */}
              <div className="grid gap-4">
                {[
                  { icon: Smartphone, text: t('security.twoFactor.features.totp'), color: 'text-primary' },
                  { icon: KeyRound, text: t('security.twoFactor.features.backupCodes'), color: 'text-success' },
                  { icon: Monitor, text: t('security.twoFactor.features.trustDevice'), color: 'text-info' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-border/50 transition-colors">
                    <div className={cn('size-10 rounded-xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center border border-primary/10')}>
                      <item.icon className={cn('size-5', item.color)} />
                    </div>
                    <span className="text-sm font-medium text-foreground/80">{item.text}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setSetupOpen(true)}
                className="w-full gap-3 h-14 text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
              >
                <Fingerprint className="size-5" />
                {t('security.twoFactor.enable')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Setup Dialog */}
      <TwoFactorSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onComplete={handleSetupComplete}
      />

      {/* Disable 2FA Dialog */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent className="border-0 shadow-2xl">
          <div className="flex items-center gap-5 mb-4">
            <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <AlertTriangle className="size-7 text-destructive" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-xl">{t('security.twoFactor.disableDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('security.twoFactor.disableDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="py-4">
            <label className="text-sm font-medium mb-2.5 block">{t('security.twoFactor.disableDialog.confirmPassword')}</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('security.changePassword.currentPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12 h-12 rounded-xl"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel onClick={() => { setPassword(''); setShowPassword(false); }} className="rounded-xl">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableMutation.mutate(password)}
              disabled={!password || disableMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {disableMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {t('security.twoFactor.disableDialog.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Backup Codes Dialog */}
      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent className="border-0 shadow-2xl">
          <div className="flex items-center gap-5 mb-4">
            <div className="size-14 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20">
              <RefreshCw className="size-7 text-warning" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-xl">{t('security.twoFactor.regenerateDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('security.twoFactor.regenerateDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="py-4">
            <label className="text-sm font-medium mb-2.5 block">{t('security.twoFactor.disableDialog.confirmPassword')}</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('security.changePassword.currentPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12 h-12 rounded-xl"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel onClick={() => { setPassword(''); setShowPassword(false); }} className="rounded-xl">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateMutation.mutate(password)}
              disabled={!password || regenerateMutation.isPending}
              className="rounded-xl"
            >
              {regenerateMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {t('security.twoFactor.regenerateDialog.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Backup Codes Dialog */}
      <AlertDialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <AlertDialogContent className="sm:max-w-lg border-0 shadow-2xl">
          <div className="flex items-center gap-5 mb-4">
            <div className="size-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
              <CheckCircle2 className="size-7 text-success" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-xl">{t('security.twoFactor.newCodesDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('security.twoFactor.newCodesDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="py-4">
            <div className="bg-muted/30 rounded-2xl p-5 border border-border/40">
              <div className="grid grid-cols-2 gap-3">
                {newBackupCodes?.map((code, i) => (
                  <code key={i} className="bg-card px-4 py-3 rounded-xl font-mono text-sm text-center border border-border/50 tracking-widest font-medium">
                    {code}
                  </code>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={downloadBackupCodes}
              className="w-full mt-5 gap-2.5 h-12 rounded-xl"
            >
              <Download className="size-4" />
              {t('security.twoFactor.newCodesDialog.download')}
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowBackupCodes(false);
                setNewBackupCodes(null);
              }}
              className="rounded-xl"
            >
              {t('security.twoFactor.newCodesDialog.saved')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================
// Passkeys Card
// ============================================

function PasskeyCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteCredentialId, setDeleteCredentialId] = useState<string | null>(null);
  const [goPasswordlessDialogOpen, setGoPasswordlessDialogOpen] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');

  const supportsPasskey = typeof window !== 'undefined' && browserSupportsWebAuthn();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['webauthn-status'],
    queryFn: () => webauthnApi.getStatus(),
    enabled: supportsPasskey,
  });

  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['webauthn-credentials'],
    queryFn: () => webauthnApi.listCredentials(),
    enabled: supportsPasskey,
  });

  const credentials = credentialsData?.credentials || [];

  const registerMutation = useMutation({
    mutationFn: async (name: string) => {
      const { options, challengeToken } = await webauthnApi.getRegistrationOptions();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const regResponse = await startRegistration({ optionsJSON: options as any });
      return webauthnApi.verifyRegistration({
        name,
        challengeToken,
        response: regResponse,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webauthn-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['webauthn-status'] });
      toast.success('Passkey added successfully');
      setAddDialogOpen(false);
      setPasskeyName('');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to add passkey';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: webauthnApi.deleteCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webauthn-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['webauthn-status'] });
      toast.success('Passkey deleted');
      setDeleteCredentialId(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete passkey';
      toast.error(message);
    },
  });

  const goPasswordlessMutation = useMutation({
    mutationFn: webauthnApi.goPasswordless,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webauthn-status'] });
      toast.success('You are now passwordless!', {
        description: 'Use your passkeys to sign in from now on.',
      });
      setGoPasswordlessDialogOpen(false);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to go passwordless';
      toast.error(message);
    },
  });

  const handleAddPasskey = () => {
    if (!passkeyName.trim()) {
      toast.error('Please enter a name for your passkey');
      return;
    }
    registerMutation.mutate(passkeyName.trim());
  };

  if (!supportsPasskey) {
    return (
      <div className="island p-10 text-center border-0 shadow-lg shadow-black/[0.02]">
        <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5 border border-border/50">
          <Fingerprint className="size-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{t('security.passkeys.notSupported')}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t('security.passkeys.notSupportedDescription')}
        </p>
      </div>
    );
  }

  if (statusLoading || credentialsLoading) {
    return (
      <div className="island p-10 border-0 shadow-lg shadow-black/[0.02]">
        <div className="flex items-center gap-5 animate-pulse">
          <div className="size-16 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-muted rounded-lg" />
            <div className="h-4 w-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
        {/* Header */}
        <div className={cn(
          'px-8 py-5 flex items-center gap-5 border-b',
          status?.hasPasskeys
            ? 'bg-gradient-to-r from-primary/12 via-primary/6 to-transparent border-primary/20'
            : 'bg-gradient-to-r from-muted/40 to-transparent border-border/40'
        )}>
          <div className={cn(
            'size-14 rounded-2xl flex items-center justify-center shadow-sm',
            status?.hasPasskeys
              ? 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20'
              : 'bg-muted/50 border border-border/50'
          )}>
            <Fingerprint className={cn(
              'size-7',
              status?.hasPasskeys ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-xl tracking-tight">{t('security.passkeys.title')}</span>
              {status?.isPasswordless && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/20">
                  Passwordless
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {status?.hasPasskeys
                ? `${status.credentialsCount} passkey${status.credentialsCount !== 1 ? 's' : ''} registered`
                : t('security.passkeys.description')}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Passkey list */}
          {credentials.length > 0 && (
            <div className="space-y-3">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-border/60 transition-all duration-200 group"
                >
                  <div className="size-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                    <Key className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium truncate">{credential.name}</span>
                      {credential.backedUp && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                          Synced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1">
                      <span>Added {formatDate(credential.createdAt)}</span>
                      {credential.lastUsedAt && (
                        <>
                          <span className="text-border/60">•</span>
                          <span>Last used {formatDate(credential.lastUsedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteCredentialId(credential.id)}
                    className="size-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete passkey</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="flex-1 gap-2.5 h-12 rounded-xl shadow-lg shadow-primary/15"
            >
              <Plus className="size-4" />
              {t('security.passkeys.addPasskey')}
            </Button>

            {status?.canGoPasswordless && !status.isPasswordless && (
              <Button
                variant="outline"
                onClick={() => setGoPasswordlessDialogOpen(true)}
                className="flex-1 gap-2.5 h-12 rounded-xl border-border/60 hover:border-primary/40"
              >
                <ShieldOff className="size-4" />
                {t('security.passkeys.goPasswordless')}
              </Button>
            )}
          </div>

          {/* Info text for empty state */}
          {!status?.hasPasskeys && (
            <div className="grid gap-4 pt-2">
              {[
                { icon: Fingerprint, text: t('security.passkeys.features.biometrics'), color: 'text-primary' },
                { icon: ShieldCheck, text: t('security.passkeys.features.phishingResistant'), color: 'text-success' },
                { icon: Monitor, text: t('security.passkeys.features.synced'), color: 'text-info' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center border border-primary/10">
                    <item.icon className={cn('size-5', item.color)} />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {status?.isPasswordless && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-success/5 border border-success/20">
              <div className="size-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-success mb-1">{t('security.passkeys.passwordlessEnabled.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('security.passkeys.passwordlessEnabled.description')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Passkey Dialog - Premium Design */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="border-0 shadow-2xl sm:max-w-[440px] p-0 overflow-hidden gap-0">
          {/* Decorative gradient header */}
          <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent overflow-hidden">
            {/* Animated gradient orbs */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/30 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-warm/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }} />

            {/* Centered icon with glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/40 rounded-3xl blur-xl scale-150" />
                <div className="relative size-20 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center border border-primary/30 backdrop-blur-sm shadow-lg shadow-primary/20">
                  <Fingerprint className="size-10 text-primary" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-6">
            {/* Title & description */}
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

            {/* Input section */}
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
                {/* Device icon hint */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors">
                  <Monitor className="size-5" />
                </div>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { key: 'macbook', label: t('security.passkeys.addDialog.suggestions.macbook') },
                  { key: 'iphone', label: t('security.passkeys.addDialog.suggestions.iphone') },
                  { key: 'securityKey', label: t('security.passkeys.addDialog.suggestions.securityKey') },
                ].map((suggestion) => (
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

            {/* Info callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40 mb-8">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="size-4 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground/80">{t('security.passkeys.addDialog.secureNote')}</span>
                <br />
                {t('security.passkeys.addDialog.secureNoteDescription')}
              </div>
            </div>

            {/* Actions */}
            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  setPasskeyName('');
                }}
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

      {/* Delete Passkey Dialog */}
      <AlertDialog open={!!deleteCredentialId} onOpenChange={() => setDeleteCredentialId(null)}>
        <AlertDialogContent className="border-0 shadow-2xl">
          <div className="flex items-center gap-5 mb-4">
            <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <Trash2 className="size-7 text-destructive" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-xl">{t('security.passkeys.deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('security.passkeys.deleteDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCredentialId && deleteMutation.mutate(deleteCredentialId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {t('security.passkeys.deleteDialog.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Go Passwordless Dialog */}
      <AlertDialog open={goPasswordlessDialogOpen} onOpenChange={setGoPasswordlessDialogOpen}>
        <AlertDialogContent className="border-0 shadow-2xl">
          <div className="flex items-center gap-5 mb-4">
            <div className="size-14 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20">
              <ShieldOff className="size-7 text-warning" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-xl">{t('security.passkeys.passwordlessDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('security.passkeys.passwordlessDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-success/5 border border-success/20">
              <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {t('security.passkeys.passwordlessDialog.passkeyCount', { count: status?.credentialsCount ?? 0 })}
              </p>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-warning/5 border border-warning/20">
              <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {t('security.passkeys.passwordlessDialog.warning')}
              </p>
            </div>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => goPasswordlessMutation.mutate()}
              disabled={goPasswordlessMutation.isPending}
              className="rounded-xl"
            >
              {goPasswordlessMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {t('security.passkeys.passwordlessDialog.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Helper function for date formatting
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================
// Password Change Form
// ============================================

function PasswordChangeForm() {
  const { t } = useTranslation();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordFormSchema),
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: securityApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully', {
        description: 'All other sessions have been revoked.',
      });
      form.reset();
    },
    onError: (error) => {
      const handled = handleApiFieldErrors(error, form.setError);
      if (!handled) {
        toast.error('Failed to change password');
      }
    },
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    mutation.mutate(data);
  };

  const togglePassword = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('security.changePassword.currentPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.current ? 'text' : 'password'}
                      placeholder={t('security.changePassword.currentPasswordPlaceholder')}
                      autoComplete="current-password"
                      className="pr-12 h-12 rounded-xl"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                      onClick={() => togglePassword('current')}
                    >
                      {showPasswords.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('security.changePassword.newPassword')}
              </span>
            </div>
          </div>

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('security.changePassword.newPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.new ? 'text' : 'password'}
                      placeholder={t('security.changePassword.newPasswordPlaceholder')}
                      autoComplete="new-password"
                      className="pr-12 h-12 rounded-xl"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                      onClick={() => togglePassword('new')}
                    >
                      {showPasswords.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('security.changePassword.confirmPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.confirm ? 'text' : 'password'}
                      placeholder={t('security.changePassword.confirmPasswordPlaceholder')}
                      autoComplete="new-password"
                      className="pr-12 h-12 rounded-xl"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                      onClick={() => togglePassword('confirm')}
                    >
                      {showPasswords.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="sm:w-auto w-full gap-2.5 h-12 rounded-xl shadow-lg shadow-primary/15"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  {t('security.changePassword.submit')}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-2 sm:ml-2">
              <AlertTriangle className="size-4 text-warning shrink-0" />
              {t('security.changePassword.signOutWarning')}
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ============================================
// Sessions List
// ============================================

function SessionsList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => securityApi.getSessions(),
    refetchInterval: 60000,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: securityApi.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session revoked');
      setRevokeSessionId(null);
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: securityApi.revokeAllOtherSessions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(data.message);
      setRevokeAllDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to revoke sessions');
    },
  });

  const sessions = data?.sessions || [];
  const currentSession = sessions.find(s => s.isCurrent);
  const otherSessions = sessions.filter(s => !s.isCurrent);

  if (isLoading) {
    return (
      <div className="island p-6 border-0 shadow-lg shadow-black/[0.02]">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="size-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="island p-10 text-center border-0 shadow-lg shadow-black/[0.02]">
        <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4 border border-destructive/20">
          <XCircle className="size-7 text-destructive" />
        </div>
        <p className="font-medium mb-1">{t('security.activeSessions.failedToLoad')}</p>
        <p className="text-sm text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  return (
    <>
      <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
        {/* Current Session */}
        {currentSession && (
          <div className="p-5 bg-gradient-to-r from-success/5 to-transparent border-b border-border/40">
            <SessionRow
              session={currentSession}
              onRevoke={() => {}}
              isRevoking={false}
              isCurrent
            />
          </div>
        )}

        {/* Other Sessions */}
        {otherSessions.length > 0 && (
          <>
            <div className="px-5 py-3 flex items-center justify-between bg-muted/20 border-b border-border/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('security.activeSessions.otherSessions', { count: otherSessions.length })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeAllDialogOpen(true)}
                disabled={revokeAllMutation.isPending}
                className="h-8 px-3 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
              >
                {revokeAllMutation.isPending ? (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                ) : (
                  <LogOut className="size-3 mr-1.5" />
                )}
                {t('security.activeSessions.revokeAll')}
              </Button>
            </div>
            <div className="divide-y divide-border/40">
              {otherSessions.map((session) => (
                <div key={session.id} className="p-5 hover:bg-muted/10 transition-colors">
                  <SessionRow
                    session={session}
                    onRevoke={() => setRevokeSessionId(session.id)}
                    isRevoking={revokeSessionMutation.isPending && revokeSessionId === session.id}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {otherSessions.length === 0 && currentSession && (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('security.activeSessions.noOtherSessions')}</p>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="p-12 text-center">
            <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border/50">
              <Monitor className="size-7 text-muted-foreground/50" />
            </div>
            <p className="font-medium mb-1">No active sessions</p>
            <p className="text-sm text-muted-foreground">{t('security.activeSessions.sessionsAppearHere')}</p>
          </div>
        )}
      </div>

      {/* Revoke single session dialog */}
      <AlertDialog open={!!revokeSessionId} onOpenChange={() => setRevokeSessionId(null)}>
        <AlertDialogContent className="border-0 shadow-2xl">
          <div className="flex items-center gap-5 mb-4">
            <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <LogOut className="size-7 text-destructive" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-xl">{t('security.activeSessions.revokeSession')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('security.activeSessions.revokeConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeSessionId && revokeSessionMutation.mutate(revokeSessionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {t('security.activeSessions.revokeSession')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke all sessions dialog */}
      <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <AlertDialogContent className="border-0 shadow-2xl">
          <div className="flex items-center gap-5 mb-4">
            <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <LogOut className="size-7 text-destructive" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-xl">{t('security.activeSessions.revokeAllSessions')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('security.activeSessions.revokeAllConfirm', { count: otherSessions.length })}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {t('security.activeSessions.revokeAllSessions')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================
// Session Row
// ============================================

function SessionRow({
  session,
  onRevoke,
  isRevoking,
  isCurrent = false,
}: {
  session: Session;
  onRevoke: () => void;
  isRevoking: boolean;
  isCurrent?: boolean;
}) {
  const isMobile = session.deviceInfo?.toLowerCase().includes('mobile') ||
                   session.deviceInfo?.toLowerCase().includes('ios') ||
                   session.deviceInfo?.toLowerCase().includes('android');

  const DeviceIcon = isMobile ? Smartphone : Monitor;
  const lastActive = getRelativeTime(new Date(session.lastActive));

  return (
    <div className="flex items-center gap-4">
      <div className={cn(
        'size-12 rounded-xl flex items-center justify-center shrink-0 border',
        isCurrent
          ? 'bg-success/10 border-success/20'
          : 'bg-muted/30 border-border/40'
      )}>
        <DeviceIcon className={cn(
          'size-5',
          isCurrent ? 'text-success' : 'text-muted-foreground'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1">
          <span className={cn(
            'font-medium text-sm truncate',
            isCurrent && 'text-success'
          )}>
            {session.deviceInfo || 'Unknown Device'}
          </span>
          {isCurrent && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
              Current
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {session.ipAddress && (
            <>
              <Globe className="size-3" />
              <span>{session.ipAddress}</span>
              <span className="text-border/60">•</span>
            </>
          )}
          <Clock className="size-3" />
          <span>{isCurrent ? 'Active now' : lastActive}</span>
        </div>
      </div>

      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          className="size-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-xl"
        >
          {isRevoking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" />
          )}
          <span className="sr-only">Revoke</span>
        </Button>
      )}
    </div>
  );
}

// ============================================
// Security Checklist
// ============================================

function SecurityChecklist() {
  const { t } = useTranslation();
  const supportsPasskey = typeof window !== 'undefined' && browserSupportsWebAuthn();

  const { data: totpStatus } = useQuery({
    queryKey: ['totp-status'],
    queryFn: () => totpApi.getStatus(),
  });

  const { data: webauthnStatus } = useQuery({
    queryKey: ['webauthn-status'],
    queryFn: () => webauthnApi.getStatus(),
    enabled: supportsPasskey,
  });

  const checks = [
    {
      label: t('security.checklistItems.passkeys'),
      done: webauthnStatus?.hasPasskeys ?? false,
      tip: t('security.checklistItems.passkeysDesc'),
      icon: Fingerprint,
    },
    {
      label: t('security.twoFactor.title'),
      done: totpStatus?.enabled ?? false,
      tip: t('security.twoFactor.inactiveDescription'),
      icon: Shield,
    },
    {
      label: t('settings.tips.strongPassword'),
      done: true,
      tip: t('settings.tips.strongPasswordDesc'),
      icon: Lock,
    },
    {
      label: t('security.activeSessions.title'),
      done: true,
      tip: 'Check for unfamiliar devices',
      icon: Monitor,
    },
  ];

  const completedCount = checks.filter(c => c.done).length;

  return (
    <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
      {/* Progress header */}
      <div className="px-5 py-4 bg-gradient-to-r from-muted/30 to-transparent border-b border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('security.completeCount', { current: completedCount, total: checks.length })}
          </span>
          <div className="w-24 h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / checks.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {checks.map((check, i) => (
          <div key={i} className="p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
            <div className={cn(
              'size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border',
              check.done
                ? 'bg-success/10 border-success/20'
                : 'bg-warning/10 border-warning/20'
            )}>
              {check.done ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <AlertTriangle className="size-4 text-warning" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-medium',
                check.done ? 'text-foreground' : 'text-warning'
              )}>
                {check.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{check.tip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Security Tips
// ============================================

function SecurityTips() {
  const { t } = useTranslation();
  const tips = [
    {
      icon: Zap,
      title: t('security.tips.quickTip'),
      text: t('security.tips.enableBoth'),
      color: 'text-primary',
      bg: 'from-primary/10 to-primary/5',
    },
  ];

  return (
    <div className="space-y-4">
      {tips.map((tip, i) => (
        <div
          key={i}
          className={cn(
            'p-5 rounded-2xl border border-border/40 bg-gradient-to-br',
            tip.bg
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn('size-10 rounded-xl bg-card/80 flex items-center justify-center border border-border/40 shrink-0')}>
              <tip.icon className={cn('size-5', tip.color)} />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">{tip.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Loading State
// ============================================

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl scale-125" />
          <div className="relative size-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <Shield className="size-10 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-3xl border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground mb-1">{t('security.loading')}</p>
          <p className="text-sm text-muted-foreground">Please wait...</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
