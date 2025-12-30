'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { securityApi, totpApi, type Session, type TotpStatus } from '@/lib/api';
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
// Main Security Page
// ============================================

export default function SecuritySettingsPage() {
  const { user, isManager, isLoading: authLoading } = useAuth();
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
    <div className="min-h-[calc(100vh-8rem)] pb-12">
      {/* Atmospheric gradient backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-primary/[0.06] via-primary/[0.03] to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-warm/[0.04] via-transparent to-transparent rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }} />
      </div>

      {/* Back navigation */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-10 animate-fade-in-up"
      >
        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        </div>
        <span className="font-medium">Back to Settings</span>
      </Link>

      {/* Page Header */}
      <div className="relative mb-10 animate-fade-in-up stagger-1">
        <div className="island overflow-hidden">
          {/* Header gradient band */}
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-warm" />

          <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Icon with glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <div className="relative size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20">
                  <Shield className="size-8 sm:size-10 text-primary" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    Security Settings
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-success/10 text-success border border-success/20">
                    <ShieldCheck className="size-3.5" />
                    Account Protected
                  </span>
                </div>
                <p className="text-muted-foreground max-w-lg">
                  Manage your password, enable two-factor authentication, and monitor device sessions to keep your account secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left Column - Main Security Features */}
        <div className="lg:col-span-3 space-y-8">
          {/* Two-Factor Authentication Card */}
          <section className="animate-fade-in-up stagger-2">
            <TwoFactorCard />
          </section>

          {/* Password Change Card */}
          <section className="animate-fade-in-up stagger-3">
            <div className="island overflow-hidden">
              {/* Section header */}
              <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Lock className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Change Password</h2>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                </div>
              </div>
              <PasswordChangeForm />
            </div>
          </section>
        </div>

        {/* Right Column - Sessions & Tips */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Sessions */}
          <section className="animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Monitor className="size-4 text-muted-foreground" />
                Active Sessions
              </h3>
            </div>
            <SessionsList />
          </section>

          {/* Security Recommendations */}
          <section className="animate-fade-in-up stagger-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 px-1 flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Security Checklist
            </h3>
            <SecurityChecklist />
          </section>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Two-Factor Authentication Card
// ============================================

function TwoFactorCard() {
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
      <div className="island p-8">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="size-14 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-40 bg-muted rounded-lg" />
            <div className="h-4 w-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="island overflow-hidden">
        {/* Status banner */}
        <div className={cn(
          'px-6 py-4 flex items-center gap-4 border-b',
          status?.enabled
            ? 'bg-gradient-to-r from-success/10 via-success/5 to-transparent border-success/20'
            : 'bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-warning/20'
        )}>
          <div className={cn(
            'size-12 rounded-2xl flex items-center justify-center',
            status?.enabled ? 'bg-success/15' : 'bg-warning/15'
          )}>
            {status?.enabled ? (
              <ShieldCheck className="size-6 text-success" />
            ) : (
              <ShieldAlert className="size-6 text-warning" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-lg">Two-Factor Authentication</span>
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                status?.enabled
                  ? 'bg-success/20 text-success'
                  : 'bg-warning/20 text-warning'
              )}>
                {status?.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {status?.enabled
                ? 'Your account is protected with an authenticator app'
                : 'Add an extra layer of security to your account'}
            </p>
          </div>
        </div>

        <div className="p-6">
          {status?.enabled ? (
            <div className="space-y-6">
              {/* Status metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="size-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Backup Codes</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-2xl font-bold tabular-nums',
                      status.backupCodesRemaining <= 2 ? 'text-warning' : 'text-foreground'
                    )}>
                      {status.backupCodesRemaining}
                    </span>
                    <span className="text-sm text-muted-foreground">remaining</span>
                  </div>
                  {status.backupCodesRemaining <= 2 && (
                    <p className="text-xs text-warning mt-2 flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Consider regenerating
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="size-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trusted Devices</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">
                      {status.trustedDevicesCount}
                    </span>
                    <span className="text-sm text-muted-foreground">devices</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRegenerateDialogOpen(true)}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="size-4" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDisableDialogOpen(true)}
                  className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Benefits list */}
              <div className="grid gap-3">
                {[
                  { icon: Smartphone, text: 'Use any TOTP authenticator app' },
                  { icon: KeyRound, text: '10 backup codes for account recovery' },
                  { icon: Monitor, text: 'Option to trust devices for 30 days' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="size-4 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>

              <Button onClick={() => setSetupOpen(true)} className="w-full gap-2 h-12">
                <Fingerprint className="size-5" />
                Enable Two-Factor Authentication
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
        <AlertDialogContent>
          <div className="flex items-center gap-4 mb-2">
            <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the extra security layer from your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Confirm your password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPassword(''); setShowPassword(false); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableMutation.mutate(password)}
              disabled={!password || disableMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disableMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Backup Codes Dialog */}
      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent>
          <div className="flex items-center gap-4 mb-2">
            <div className="size-12 rounded-2xl bg-warning/10 flex items-center justify-center">
              <RefreshCw className="size-6 text-warning" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle>Regenerate Backup Codes</AlertDialogTitle>
              <AlertDialogDescription>
                This will invalidate all existing backup codes and generate new ones.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Confirm your password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPassword(''); setShowPassword(false); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateMutation.mutate(password)}
              disabled={!password || regenerateMutation.isPending}
            >
              {regenerateMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Regenerate Codes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Backup Codes Dialog */}
      <AlertDialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <AlertDialogContent className="sm:max-w-md">
          <div className="flex items-center gap-4 mb-2">
            <div className="size-12 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle>New Backup Codes Generated</AlertDialogTitle>
              <AlertDialogDescription>
                Save these codes in a safe place. Each code can only be used once.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="py-4">
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <div className="grid grid-cols-2 gap-2">
                {newBackupCodes?.map((code, i) => (
                  <code key={i} className="bg-card px-3 py-2.5 rounded-lg font-mono text-sm text-center border border-border/50 tracking-wider">
                    {code}
                  </code>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={downloadBackupCodes}
              className="w-full mt-4 gap-2"
            >
              <Download className="size-4" />
              Download as Text File
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowBackupCodes(false);
              setNewBackupCodes(null);
            }}>
              I've Saved My Codes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================
// Password Change Form
// ============================================

function PasswordChangeForm() {
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
    <div className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.current ? 'text' : 'password'}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
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

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
                New Password
              </span>
            </div>
          </div>

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.new ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
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
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.confirm ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
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
              className="sm:w-auto w-full gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  Update Password
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-warning shrink-0" />
              This will sign out all other devices
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
      <div className="island p-5">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="size-10 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="island p-8 text-center">
        <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
          <XCircle className="size-6 text-destructive" />
        </div>
        <p className="text-sm font-medium mb-1">Failed to load sessions</p>
        <p className="text-xs text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  return (
    <>
      <div className="island overflow-hidden">
        {/* Current Session */}
        {currentSession && (
          <div className="p-4 bg-gradient-to-r from-success/5 to-transparent border-b border-border/50">
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
            <div className="px-4 py-2.5 flex items-center justify-between bg-muted/30 border-b border-border/50">
              <span className="text-xs font-medium text-muted-foreground">
                {otherSessions.length} other session{otherSessions.length !== 1 && 's'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeAllDialogOpen(true)}
                disabled={revokeAllMutation.isPending}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {revokeAllMutation.isPending ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : (
                  <LogOut className="size-3 mr-1" />
                )}
                Revoke All
              </Button>
            </div>
            <div className="divide-y divide-border/50">
              {otherSessions.map((session) => (
                <div key={session.id} className="p-4 hover:bg-muted/20 transition-colors">
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
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No other active sessions</p>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="p-10 text-center">
            <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Monitor className="size-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium mb-1">No active sessions</p>
            <p className="text-xs text-muted-foreground">Sessions will appear here</p>
          </div>
        )}
      </div>

      {/* Revoke single session dialog */}
      <AlertDialog open={!!revokeSessionId} onOpenChange={() => setRevokeSessionId(null)}>
        <AlertDialogContent>
          <div className="flex items-center gap-4 mb-2">
            <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="size-6 text-destructive" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle>Revoke Session</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign out the device. They'll need to log in again to access the account.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeSessionId && revokeSessionMutation.mutate(revokeSessionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke all sessions dialog */}
      <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <AlertDialogContent>
          <div className="flex items-center gap-4 mb-2">
            <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="size-6 text-destructive" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle>Revoke All Other Sessions</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign out all {otherSessions.length} other device{otherSessions.length !== 1 && 's'} from your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke All Sessions
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
    <div className="flex items-center gap-3">
      <div className={cn(
        'size-10 rounded-xl flex items-center justify-center shrink-0',
        isCurrent ? 'bg-success/10' : 'bg-muted/50'
      )}>
        <DeviceIcon className={cn(
          'size-4',
          isCurrent ? 'text-success' : 'text-muted-foreground'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            'font-medium text-sm truncate',
            isCurrent && 'text-success'
          )}>
            {session.deviceInfo || 'Unknown Device'}
          </span>
          {isCurrent && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 text-success">
              Current
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {session.ipAddress && (
            <>
              <Globe className="size-3" />
              <span>{session.ipAddress}</span>
              <span className="text-border">•</span>
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
          className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
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
  const { data: totpStatus } = useQuery({
    queryKey: ['totp-status'],
    queryFn: () => totpApi.getStatus(),
  });

  const checks = [
    {
      label: 'Two-factor authentication',
      done: totpStatus?.enabled ?? false,
      tip: 'Adds an extra layer of security',
    },
    {
      label: 'Strong password',
      done: true, // We assume if they're logged in, they have a password
      tip: '8+ characters with mixed case',
    },
    {
      label: 'Review active sessions',
      done: true,
      tip: 'Check for unfamiliar devices',
    },
  ];

  return (
    <div className="island overflow-hidden divide-y divide-border/50">
      {checks.map((check, i) => (
        <div key={i} className="p-4 flex items-start gap-3">
          <div className={cn(
            'size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
            check.done ? 'bg-success/10' : 'bg-warning/10'
          )}>
            {check.done ? (
              <CheckCircle2 className="size-3.5 text-success" />
            ) : (
              <AlertTriangle className="size-3.5 text-warning" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium',
              check.done ? 'text-foreground' : 'text-warning'
            )}>
              {check.label}
            </p>
            <p className="text-xs text-muted-foreground">{check.tip}</p>
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
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="size-7 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <p className="text-sm text-muted-foreground">Loading security settings...</p>
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
