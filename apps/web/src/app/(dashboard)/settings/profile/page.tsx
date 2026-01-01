'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { useAuth } from '@/lib/auth';
import { profileApi, projectApi, type UserProfile, type UserPreferences } from '@/lib/api';
import { handleApiFieldErrors } from '@/lib/form-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Calendar,
  Camera,
  Trash2,
  AlertCircle,
  Loader2,
  Languages,
  Bell,
  Palette,
  FolderOpen,
  Clock,
  ArrowLeft,
  X,
  Sparkles,
  Shield,
  Hash,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================
// Validation Schemas
// ============================================

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional().or(z.literal('')),
});

const emailChangeSchema = z.object({
  newEmail: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

// ============================================
// Main Profile Page
// ============================================

export default function ProfileSettingsPage() {
  const { t } = useTranslation();
  const { user, isManager, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.push('/projects');
    }
  }, [isManager, authLoading, router]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
    enabled: !!user,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
    enabled: !!user,
  });

  if (authLoading || profileLoading) {
    return <LoadingState />;
  }

  if (!isManager || !profile) {
    return null;
  }

  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const memberDuration = profile.createdAt
    ? getRelativeTime(new Date(profile.createdAt))
    : 'Just joined';

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Subtle gradient backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/[0.03] via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-warm/[0.02] via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Back navigation */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8 animate-fade-in-up"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        <span>{t('settings.back')}</span>
      </Link>

      {/* Hero Profile Card */}
      <div className="relative mb-10 animate-fade-in-up stagger-1">
        <div className="island overflow-hidden">
          {/* Decorative header stripe */}
          <div className="h-24 sm:h-28 bg-gradient-to-r from-primary/10 via-primary/5 to-warm/5 relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.5)_50%,transparent_100%)] dark:bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
          </div>

          <div className="px-6 lg:px-8 pb-6 lg:pb-8 -mt-12 sm:-mt-14 relative">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Large Avatar */}
              <AvatarUpload profile={profile} />

              {/* Profile Info */}
              <div className="flex-1 min-w-0 pt-2 sm:pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-1">
                      {profile.name || 'Your Profile'}
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-4 shrink-0" />
                      <span className="text-sm truncate">{profile.email}</span>
                      {profile.pendingEmailChange && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                          <span className="size-1.5 rounded-full bg-warning animate-pulse" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                    <Shield className="size-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-6 mt-5 pt-5 border-t border-border/50">
                  <StatItem
                    icon={Calendar}
                    label={t('profile.memberSince')}
                    value={joinDate}
                    subtext={memberDuration}
                  />
                  <div className="hidden sm:block w-px h-8 bg-border/50" />
                  <StatItem
                    icon={Sparkles}
                    label={t('profile.accountStatus')}
                    value={t('common.active')}
                    valueClass="text-success"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Main Forms - Left Side */}
        <div className="lg:col-span-3 space-y-8">
          {/* Profile Details */}
          <ProfileForm
            profile={profile}
            onEmailChangeClick={() => setEmailDialogOpen(true)}
          />

          {/* Preferences */}
          <PreferencesForm
            profile={profile}
            projects={projectsData?.projects || []}
          />
        </div>

        {/* Sidebar - Right Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Info Card */}
          <AccountInfoCard profile={profile} />

          {/* Pending Email Change */}
          {profile.pendingEmailChange && (
            <PendingEmailChange
              newEmail={profile.pendingEmailChange}
              onCancel={async () => {
                await profileApi.cancelEmailChange();
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                toast.success('Email change cancelled');
              }}
            />
          )}

          {/* Quick Tips */}
          <QuickTipsCard />
        </div>
      </div>

      {/* Email Change Dialog */}
      <EmailChangeDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        currentEmail={profile.email}
      />
    </div>
  );
}

// ============================================
// Stat Item Component
// ============================================

function StatItem({
  icon: Icon,
  label,
  value,
  subtext,
  valueClass
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-9 rounded-lg bg-muted/50 flex items-center justify-center">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium", valueClass)}>{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground/70">{subtext}</p>}
      </div>
    </div>
  );
}

// ============================================
// Avatar Upload Component
// ============================================

function AvatarUpload({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const { refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refreshUser?.();
      toast.success('Avatar updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload avatar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => profileApi.deleteAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refreshUser?.();
      toast.success('Avatar removed');
    },
    onError: () => {
      toast.error('Failed to remove avatar');
    },
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase();

  const isLoading = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div className="relative shrink-0 group">
      {/* Avatar container with ring */}
      <div
        className={cn(
          'size-24 sm:size-28 rounded-2xl flex items-center justify-center overflow-hidden',
          'ring-4 ring-card shadow-xl transition-all duration-300',
          'bg-gradient-to-br from-primary/20 via-primary/10 to-warm/10',
          isDragging && 'ring-primary scale-105',
          !isDragging && 'hover:ring-primary/50'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <Loader2 className="size-8 text-primary animate-spin" />
        ) : profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.name || 'Avatar'}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-3xl font-semibold text-primary/80">{initials}</span>
        )}
      </div>

      {/* Hover overlay with actions */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm',
          'flex items-center justify-center gap-2',
          'opacity-0 group-hover:opacity-100 transition-all duration-200',
          'ring-4 ring-transparent group-hover:ring-primary/30'
        )}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          title="Upload photo"
        >
          <Camera className="size-5 text-white" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
          disabled={isLoading}
        />
        {profile.avatarUrl && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/20 hover:bg-destructive/80 transition-colors"
            title="Remove photo"
          >
            <Trash2 className="size-5 text-white" />
          </button>
        )}
      </div>

      {/* Edit indicator */}
      <div className="absolute -bottom-1 -right-1 size-7 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
        <Camera className="size-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

// ============================================
// Profile Form Component
// ============================================

function ProfileForm({
  profile,
  onEmailChangeClick,
}: {
  profile: UserProfile;
  onEmailChangeClick: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      name: profile.name || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) => profileApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refreshUser?.();
      toast.success('Profile updated');
    },
    onError: (error) => {
      handleApiFieldErrors(error, form.setError);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    mutation.mutate(data);
  };

  const hasChanges = form.formState.isDirty;

  return (
    <section className="animate-fade-in-up stagger-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('profile.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('profile.description')}</p>
        </div>
      </div>

      <div className="island p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.displayName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.displayNamePlaceholder')}
                      className="bg-background/50"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('profile.displayNameHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('profile.emailAddress')}</Label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-muted/50 pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {t('common.verified')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEmailChangeClick}
                  className="shrink-0"
                >
                  {t('profile.changeEmail')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('profile.emailChangeHint')}
              </p>
            </div>

            {hasChanges && (
              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset()}
                >
                  {t('profile.discard')}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  {t('profile.saveChanges')}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </section>
  );
}

// ============================================
// Preferences Form Component
// ============================================

function PreferencesForm({
  profile,
  projects,
}: {
  profile: UserProfile;
  projects: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) => profileApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Preferences saved');
    },
    onError: () => {
      toast.error('Failed to save preferences');
    },
  });

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    mutation.mutate({ [key]: value });
  };

  const updateNotification = (
    key: keyof UserPreferences['notifications'],
    value: boolean | string
  ) => {
    mutation.mutate({
      notifications: {
        ...profile.preferences.notifications,
        [key]: value,
      },
    });
  };

  return (
    <section className="animate-fade-in-up stagger-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-8 rounded-lg bg-warm/10 flex items-center justify-center">
          <Palette className="size-4 text-warm" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('profile.preferences.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('profile.preferences.description')}</p>
        </div>
      </div>

      <div className="island overflow-hidden">
        {/* Appearance group */}
        <div className="p-4 border-b border-border/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{t('profile.preferences.appearance')}</p>
          <div className="space-y-1">
            <PreferenceRow
              icon={Palette}
              title={t('profile.preferences.theme')}
              description={t('profile.preferences.colorScheme')}
            >
              <Select
                value={profile.preferences.theme}
                onValueChange={(value) => updatePreference('theme', value as UserPreferences['theme'])}
              >
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('profile.preferences.system')}</SelectItem>
                  <SelectItem value="light">{t('profile.preferences.light')}</SelectItem>
                  <SelectItem value="dark">{t('profile.preferences.dark')}</SelectItem>
                </SelectContent>
              </Select>
            </PreferenceRow>

            <PreferenceRow
              icon={Languages}
              title={t('profile.preferences.language')}
              description={t('profile.preferences.interfaceLanguage')}
            >
              <Select
                value={profile.preferences.language}
                onValueChange={(value) => updatePreference('language', value)}
              >
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('profile.preferences.english')}</SelectItem>
                  <SelectItem value="es">{t('profile.preferences.spanish')}</SelectItem>
                  <SelectItem value="fr">{t('profile.preferences.french')}</SelectItem>
                  <SelectItem value="de">{t('profile.preferences.german')}</SelectItem>
                  <SelectItem value="ja">{t('profile.preferences.japanese')}</SelectItem>
                </SelectContent>
              </Select>
            </PreferenceRow>
          </div>
        </div>

        {/* Workflow group */}
        <div className="p-4 border-b border-border/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{t('profile.preferences.workflow')}</p>
          <PreferenceRow
            icon={FolderOpen}
            title={t('profile.preferences.defaultProject')}
            description={t('profile.preferences.openOnLogin')}
          >
            <Select
              value={profile.preferences.defaultProjectId || 'none'}
              onValueChange={(value) =>
                updatePreference('defaultProjectId', value === 'none' ? null : value)
              }
            >
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder={t('profile.preferences.never')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('profile.preferences.never')}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PreferenceRow>
        </div>

        {/* Notifications group */}
        <div className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{t('profile.preferences.notifications')}</p>
          <div className="space-y-1">
            <PreferenceRow
              icon={Mail}
              title={t('profile.preferences.emailNotifications')}
              description={t('profile.preferences.emailNotificationsDesc')}
            >
              <Switch
                checked={profile.preferences.notifications.email}
                onCheckedChange={(checked: boolean) => updateNotification('email', checked)}
              />
            </PreferenceRow>

            <PreferenceRow
              icon={Bell}
              title={t('profile.preferences.inAppNotifications')}
              description={t('profile.preferences.inAppNotificationsDesc')}
            >
              <Switch
                checked={profile.preferences.notifications.inApp}
                onCheckedChange={(checked: boolean) => updateNotification('inApp', checked)}
              />
            </PreferenceRow>

            <PreferenceRow
              icon={Clock}
              title={t('profile.preferences.activityDigest')}
              description={t('profile.preferences.summaryFrequency')}
            >
              <Select
                value={profile.preferences.notifications.digestFrequency}
                onValueChange={(value) =>
                  updateNotification('digestFrequency', value as 'never' | 'daily' | 'weekly')
                }
              >
                <SelectTrigger className="w-28 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">{t('profile.preferences.never')}</SelectItem>
                  <SelectItem value="daily">{t('profile.preferences.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('profile.preferences.weekly')}</SelectItem>
                </SelectContent>
              </Select>
            </PreferenceRow>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Account Info Card
// ============================================

function AccountInfoCard({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  return (
    <section className="animate-fade-in-up stagger-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
          <Hash className="size-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('profile.accountDetails.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('profile.accountDetails.description')}</p>
        </div>
      </div>

      <div className="island p-0 overflow-hidden">
        <div className="divide-y divide-border/50">
          <InfoRow label="User ID" value={profile.id} mono copyable />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow
            label="Role"
            value={profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
            badge
          />
          <InfoRow
            label="Created"
            value={profile.createdAt
              ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'N/A'
            }
          />
        </div>
      </div>
    </section>
  );
}

// ============================================
// Quick Tips Card
// ============================================

function QuickTipsCard() {
  const { t } = useTranslation();
  const tips = [
    { title: t('profile.quickTips.keyboardShortcuts'), description: t('profile.quickTips.keyboardShortcutsDesc') },
    { title: t('profile.quickTips.apiAccess'), description: t('profile.quickTips.apiAccessDesc') },
  ];

  return (
    <section className="animate-fade-in-up stagger-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center">
          <Sparkles className="size-4 text-success" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('profile.quickTips.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('profile.quickTips.description')}</p>
        </div>
      </div>

      <div className="space-y-2">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="group island p-4 hover:border-primary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{tip.title}</p>
                <p className="text-xs text-muted-foreground">{tip.description}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// Email Change Dialog
// ============================================

function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    mode: 'onTouched',
    defaultValues: {
      newEmail: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EmailChangeFormData) => profileApi.initiateEmailChange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      onOpenChange(false);
      form.reset();
      toast.success('Verification email sent! Check your new email address.');
    },
    onError: (error) => {
      handleApiFieldErrors(error, form.setError);
    },
  });

  const onSubmit = (data: EmailChangeFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <Mail className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{t('profile.changeEmailDialog.title')}</DialogTitle>
                <DialogDescription className="mt-1">
                  {t('profile.changeEmailDialog.description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/50 text-sm border border-border/50">
                <p className="text-muted-foreground">
                  {t('profile.changeEmailDialog.currentEmail')} <span className="font-medium text-foreground">{currentEmail}</span>
                </p>
              </div>

              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.emailAddress')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('profile.changeEmailDialog.newEmailPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('profile.changeEmailDialog.passwordPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('profile.changeEmailDialog.passwordHint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                )}
                {t('profile.changeEmailDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Helper Components
// ============================================

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-warm/10 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="size-7 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{t('profile.loading')}</p>
          <p className="text-xs text-muted-foreground">{t('profile.loadingMessage')}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  badge = false,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
  copyable?: boolean;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3",
        copyable && "cursor-pointer hover:bg-muted/30 transition-colors"
      )}
      onClick={copyable ? handleCopy : undefined}
      title={copyable ? 'Click to copy' : undefined}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? (
        <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
          {value}
        </span>
      ) : (
        <span className={cn(
          'text-sm font-medium',
          mono && 'font-mono text-xs bg-muted/50 px-2 py-0.5 rounded'
        )}>
          {value}
        </span>
      )}
    </div>
  );
}

function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PendingEmailChange({
  newEmail,
  onCancel,
}: {
  newEmail: string;
  onCancel: () => void;
}) {
  return (
    <section className="animate-fade-in-up stagger-5">
      <div className="island p-4 border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <AlertCircle className="size-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Email Change Pending</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Verification sent to <span className="font-medium text-foreground">{newEmail}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onCancel}
            >
              <X className="size-3 mr-1.5" />
              Cancel Change
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Utility Functions
// ============================================

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
