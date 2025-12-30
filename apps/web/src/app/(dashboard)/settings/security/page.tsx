'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { securityApi, type Session } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
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
  Languages,
  Fingerprint,
  LogOut,
  Sparkles,
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
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Atmospheric gradient backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary/[0.04] via-primary/[0.02] to-transparent rounded-full blur-3xl translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-warm/[0.03] via-transparent to-transparent rounded-full blur-3xl -translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-radial from-primary/[0.02] to-transparent rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Back navigation */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8 animate-fade-in-up"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Settings</span>
      </Link>

      {/* Hero Section */}
      <div className="relative mb-10 animate-fade-in-up stagger-1">
        <div className="island overflow-hidden">
          {/* Decorative header with refined gradient */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-primary/12 via-primary/6 to-warm/8 relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(124, 110, 230, 0.1) 0%, transparent 50%),
                                  radial-gradient(circle at 80% 50%, rgba(232, 145, 111, 0.08) 0%, transparent 50%)`
              }} />
            </div>
            {/* Light sweep effect */}
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.4)_50%,transparent_70%)] dark:bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.05)_50%,transparent_70%)]" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
            {/* Decorative geometric shapes */}
            <div className="absolute top-4 right-8 size-24 rounded-full border border-primary/10 opacity-60" />
            <div className="absolute top-8 right-16 size-16 rounded-full border border-warm/10 opacity-40" />
          </div>

          <div className="px-6 lg:px-8 pb-8 -mt-14 sm:-mt-16 relative">
            <div className="flex items-end sm:items-center gap-5">
              {/* Shield Icon Container - elevated style */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-warm/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative size-20 sm:size-24 rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 flex items-center justify-center border border-primary/10 shadow-xl">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent" />
                  <Shield className="size-10 sm:size-12 text-primary relative z-10" />
                  {/* Subtle animated ring */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-pulse" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <div className="flex-1 pb-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    Security
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
                    <ShieldCheck className="size-3" />
                    Protected
                  </span>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Manage your password and monitor active sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid - refined proportions */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Content */}
        <div className="lg:col-span-7 space-y-8">
          {/* Password Change Section */}
          <section className="animate-fade-in-up stagger-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="size-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Change Password</h2>
                <p className="text-xs text-muted-foreground">Update your account credentials</p>
              </div>
            </div>
            <PasswordChangeForm />
          </section>

          {/* Active Sessions Section */}
          <section className="animate-fade-in-up stagger-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Monitor className="size-4 text-info" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Active Sessions</h2>
                <p className="text-xs text-muted-foreground">Devices currently signed into your account</p>
              </div>
            </div>
            <SessionsList />
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security Status Card */}
          <div className="animate-fade-in-up stagger-4">
            <div className="island p-6 relative overflow-hidden">
              {/* Decorative corner gradient */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-success/10 to-transparent rounded-bl-full" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <ShieldCheck className="size-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Security Status</p>
                    <p className="text-lg font-semibold text-success">Good</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <SecurityStatusItem
                    icon={Lock}
                    label="Password"
                    status="Set"
                    statusColor="success"
                  />
                  <SecurityStatusItem
                    icon={Fingerprint}
                    label="Two-Factor Auth"
                    status="Coming Soon"
                    statusColor="muted"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security Tips */}
          <div className="animate-fade-in-up stagger-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
              Security Tips
            </h3>
            <div className="island overflow-hidden">
              <SecurityTip
                icon={KeyRound}
                title="Use Strong Passwords"
                description="Combine letters, numbers, and symbols for maximum security."
                accentColor="primary"
              />
              <div className="divider-fade mx-5" />
              <SecurityTip
                icon={Monitor}
                title="Review Sessions Regularly"
                description="Check for unfamiliar devices and revoke access if needed."
                accentColor="info"
              />
              <div className="divider-fade mx-5" />
              <SecurityTip
                icon={ShieldAlert}
                title="Act on Suspicious Activity"
                description="Change your password immediately if you notice anything unusual."
                accentColor="warning"
              />
            </div>
          </div>

          {/* Password Requirements */}
          <div className="animate-fade-in-up stagger-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
              Password Requirements
            </h3>
            <div className="island p-5">
              <div className="grid grid-cols-2 gap-3">
                <PasswordRequirement icon="8+" text="8+ characters" />
                <PasswordRequirement icon="Aa" text="Mixed case" />
                <PasswordRequirement icon="123" text="Numbers" />
                <PasswordRequirement icon={Sparkles} text="Unique" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Security Status Item
// ============================================

function SecurityStatusItem({
  icon: Icon,
  label,
  status,
  statusColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: string;
  statusColor: 'success' | 'warning' | 'muted';
}) {
  const colorClasses = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    muted: 'text-muted-foreground bg-muted',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-full',
        colorClasses[statusColor]
      )}>
        {status}
      </span>
    </div>
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
    <div className="island p-6 relative overflow-hidden">
      {/* Subtle decorative element */}
      <div className="absolute -top-12 -right-12 size-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Current Password</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      {...field}
                      type={showPasswords.current ? 'text' : 'password'}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      className="pr-10 transition-shadow focus:shadow-[0_0_0_4px_rgba(124,110,230,0.1)]"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded"
                      onClick={() => togglePassword('current')}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Visual separator */}
          <div className="relative py-2">
            <div className="divider-fade" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
              New Password
            </span>
          </div>

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.new ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      className="pr-10 transition-shadow focus:shadow-[0_0_0_4px_rgba(124,110,230,0.1)]"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded"
                      onClick={() => togglePassword('new')}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
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
                <FormLabel className="text-sm font-medium">Confirm New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPasswords.confirm ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                      className="pr-10 transition-shadow focus:shadow-[0_0_0_4px_rgba(124,110,230,0.1)]"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded"
                      onClick={() => togglePassword('confirm')}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="min-w-[160px]"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="size-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-warning shrink-0" />
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
      <div className="island p-6">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="size-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="island p-8">
        <div className="text-center">
          <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <XCircle className="size-6 text-destructive" />
          </div>
          <p className="text-sm font-medium mb-1">Failed to load sessions</p>
          <p className="text-xs text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="island overflow-hidden">
        {/* Current Session - highlighted */}
        {currentSession && (
          <div className="p-5 bg-gradient-to-r from-success/5 via-success/[0.02] to-transparent border-b border-border relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-success rounded-r" />
            <SessionRow
              session={currentSession}
              onRevoke={() => {}}
              isRevoking={false}
              isHighlighted
            />
          </div>
        )}

        {/* Other Sessions Header */}
        {otherSessions.length > 0 && (
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Other Sessions</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {otherSessions.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevokeAllDialogOpen(true)}
              disabled={revokeAllMutation.isPending}
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {revokeAllMutation.isPending ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <LogOut className="size-3.5 mr-1.5" />
              )}
              Revoke All
            </Button>
          </div>
        )}

        {/* Other Sessions List */}
        {otherSessions.length > 0 && (
          <div className="divide-y divide-border">
            {otherSessions.map((session) => (
              <div key={session.id} className="p-5 hover:bg-muted/30 transition-colors">
                <SessionRow
                  session={session}
                  onRevoke={() => setRevokeSessionId(session.id)}
                  isRevoking={revokeSessionMutation.isPending && revokeSessionId === session.id}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty state for other sessions */}
        {otherSessions.length === 0 && currentSession && (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No other active sessions</p>
          </div>
        )}

        {/* Completely empty state */}
        {sessions.length === 0 && (
          <div className="p-10 text-center">
            <div className="size-14 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Monitor className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium mb-1">No active sessions</p>
            <p className="text-xs text-muted-foreground">Sessions will appear here when you sign in</p>
          </div>
        )}
      </div>

      {/* Revoke single session dialog */}
      <AlertDialog open={!!revokeSessionId} onOpenChange={() => setRevokeSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out the device associated with this session. They will need to log in again to access the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke All Other Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out all devices except your current session. {otherSessions.length} session{otherSessions.length !== 1 ? 's' : ''} will be revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke All Others
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
  isHighlighted = false,
}: {
  session: Session;
  onRevoke: () => void;
  isRevoking: boolean;
  isHighlighted?: boolean;
}) {
  const isMobile = session.deviceInfo?.toLowerCase().includes('mobile') ||
                   session.deviceInfo?.toLowerCase().includes('ios') ||
                   session.deviceInfo?.toLowerCase().includes('android');

  const DeviceIcon = isMobile ? Smartphone : Monitor;
  const lastActive = getRelativeTime(new Date(session.lastActive));

  return (
    <div className="flex items-center gap-4">
      {/* Device icon */}
      <div className={cn(
        'size-12 rounded-xl flex items-center justify-center shrink-0 transition-colors',
        session.isCurrent
          ? 'bg-success/10 ring-1 ring-success/20'
          : 'bg-muted/50 group-hover:bg-muted'
      )}>
        <DeviceIcon className={cn(
          'size-5',
          session.isCurrent ? 'text-success' : 'text-muted-foreground'
        )} />
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            'font-medium text-sm truncate',
            isHighlighted && 'text-success'
          )}>
            {session.deviceInfo || 'Unknown Device'}
          </span>
          {session.isCurrent && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-2.5" />
              This Device
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {session.ipAddress && (
            <span className="flex items-center gap-1">
              <Globe className="size-3 opacity-60" />
              {session.ipAddress}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="size-3 opacity-60" />
            {session.isCurrent ? 'Active now' : lastActive}
          </span>
        </div>
      </div>

      {/* Revoke button */}
      {!session.isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          {isRevoking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" />
          )}
          <span className="sr-only">Revoke session</span>
        </Button>
      )}
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function SecurityTip({
  icon: Icon,
  title,
  description,
  accentColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accentColor: 'primary' | 'info' | 'warning';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className="p-5 flex items-start gap-4 group">
      <div className={cn(
        'size-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
        colorClasses[accentColor]
      )}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-medium text-sm mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function PasswordRequirement({
  icon,
  text
}: {
  icon: string | React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/50">
      <div className="size-6 rounded-md bg-success/10 flex items-center justify-center shrink-0">
        {typeof icon === 'string' ? (
          <span className="text-[10px] font-bold text-success">{icon}</span>
        ) : (
          (() => {
            const Icon = icon;
            return <Icon className="size-3 text-success" />;
          })()
        )}
      </div>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="size-6 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-xl border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
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
