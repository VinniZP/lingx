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
  Zap,
  Key,
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
    <div className="min-h-[calc(100vh-8rem)] pb-16">
      {/* Premium atmospheric backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-bl from-info/[0.08] via-info/[0.04] to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 animate-pulse" style={{ animationDuration: '8s' }} />
        {/* Warm accent orb */}
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-to-tr from-warm/[0.06] via-warm/[0.02] to-transparent rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        {/* Floating accent orb */}
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-r from-primary/[0.04] to-info/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '12s' }} />
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

      {/* Premium Page Header */}
      <div className="relative mb-12 animate-fade-in-up stagger-1">
        <div className="island overflow-hidden border-0 shadow-lg shadow-info/[0.03]">
          {/* Gradient accent band */}
          <div className="h-1.5 bg-gradient-to-r from-info via-info/70 to-primary" />

          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              {/* Icon with premium glow effect */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-info/25 rounded-3xl blur-2xl scale-110" />
                <div className="absolute inset-0 bg-gradient-to-br from-info/30 to-primary/20 rounded-3xl blur-xl" />
                <div className="relative size-20 lg:size-24 rounded-3xl bg-gradient-to-br from-info/20 via-info/10 to-primary/5 flex items-center justify-center border border-info/20 backdrop-blur-sm">
                  <User className="size-10 lg:size-12 text-info" />
                  <Sparkles className="absolute -top-1 -right-1 size-5 text-info animate-pulse" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                    {t('profile.title')}
                  </h1>
                  {/* Role badge */}
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
                  </span>
                </div>
                <p className="text-muted-foreground text-base lg:text-lg max-w-xl leading-relaxed">
                  {t('profile.description')}
                </p>
              </div>

              {/* Profile Summary Widget */}
              <ProfileSummaryWidget profile={profile} joinDate={joinDate} memberDuration={memberDuration} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:gap-10 lg:grid-cols-12">
        {/* Left Column - Main Forms */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Avatar & Basic Info Card */}
          <section className="animate-fade-in-up stagger-2">
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              {/* Section header with subtle gradient */}
              <div className="px-8 py-6 border-b border-border/40 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-info/15 to-info/5 flex items-center justify-center border border-info/10">
                    <Camera className="size-5 text-info" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{t('profile.avatar')}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{t('profile.avatarDescription')}</p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <AvatarUpload profile={profile} />
              </div>
            </div>
          </section>

          {/* Profile Details Form */}
          <section className="animate-fade-in-up stagger-3">
            <ProfileForm
              profile={profile}
              onEmailChangeClick={() => setEmailDialogOpen(true)}
            />
          </section>

          {/* Preferences */}
          <section className="animate-fade-in-up stagger-4">
            <PreferencesForm
              profile={profile}
              projects={projectsData?.projects || []}
            />
          </section>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
          {/* Quick Info Card */}
          <section className="animate-fade-in-up stagger-5">
            <AccountInfoCard profile={profile} />
          </section>

          {/* Pending Email Change */}
          {profile.pendingEmailChange && (
            <section className="animate-fade-in-up stagger-5">
              <PendingEmailChange
                newEmail={profile.pendingEmailChange}
                onCancel={async () => {
                  await profileApi.cancelEmailChange();
                  queryClient.invalidateQueries({ queryKey: ['profile'] });
                  toast.success('Email change cancelled');
                }}
              />
            </section>
          )}

          {/* Quick Tips */}
          <section className="animate-fade-in-up stagger-6">
            <QuickTipsCard />
          </section>
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
// Profile Summary Widget
// ============================================

function ProfileSummaryWidget({
  profile,
  joinDate,
  memberDuration,
}: {
  profile: UserProfile;
  joinDate: string;
  memberDuration: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 min-w-[200px]">
      <div className="flex items-center gap-4 mb-4">
        {/* Avatar */}
        <div className="size-14 rounded-xl bg-gradient-to-br from-info/20 via-info/10 to-primary/10 flex items-center justify-center border border-info/20 overflow-hidden">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name || 'Avatar'}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold text-info">
              {profile.name
                ? profile.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : profile.email[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{profile.name || t('profile.noName')}</p>
          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
        </div>
      </div>
      <div className="space-y-2 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('profile.memberSince')}</span>
          <span className="font-medium">{memberDuration}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('profile.accountStatus')}</span>
          <span className="font-medium text-success">{t('common.active')}</span>
        </div>
      </div>
    </div>
  );
}


// ============================================
// Avatar Upload Component
// ============================================

function AvatarUpload({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
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
    <div className="flex flex-col sm:flex-row items-start gap-6">
      {/* Avatar container with premium styling */}
      <div className="relative shrink-0 group">
        <div
          className={cn(
            'size-28 sm:size-32 rounded-2xl flex items-center justify-center overflow-hidden',
            'ring-4 ring-card shadow-xl transition-all duration-300',
            'bg-gradient-to-br from-info/20 via-info/10 to-primary/10',
            isDragging && 'ring-info scale-105',
            !isDragging && 'hover:ring-info/50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <Loader2 className="size-8 text-info animate-spin" />
          ) : profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name || 'Avatar'}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-4xl font-semibold text-info/80">{initials}</span>
          )}
        </div>

        {/* Hover overlay with actions */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm',
            'flex items-center justify-center gap-3',
            'opacity-0 group-hover:opacity-100 transition-all duration-200',
            'ring-4 ring-transparent group-hover:ring-info/30'
          )}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
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
              className="p-3 rounded-xl bg-white/20 hover:bg-destructive/80 transition-colors"
              title="Remove photo"
            >
              <Trash2 className="size-5 text-white" />
            </button>
          )}
        </div>

        {/* Edit indicator */}
        <div className="absolute -bottom-1 -right-1 size-8 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
          <Camera className="size-4 text-muted-foreground" />
        </div>
      </div>

      {/* Upload instructions */}
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('profile.uploadAvatar')}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('profile.avatarRequirements')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-10 rounded-xl gap-2"
          >
            <Camera className="size-4" />
            {t('profile.uploadNew')}
          </Button>
          {profile.avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={isLoading}
              className="h-10 rounded-xl gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              {t('profile.removeAvatar')}
            </Button>
          )}
        </div>
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
    <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
      {/* Section header with subtle gradient */}
      <div className="px-8 py-6 border-b border-border/40 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent">
        <div className="flex items-center gap-5">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('profile.personalInfo')}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t('profile.personalInfoDescription')}</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('profile.displayName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.displayNamePlaceholder')}
                      className="h-12 rounded-xl"
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

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('profile.emailAddress')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Input
                    value={profile.email}
                    disabled
                    className="h-12 rounded-xl bg-muted/30 pr-24"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
                    {t('common.verified')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEmailChangeClick}
                  className="shrink-0 h-12 rounded-xl gap-2"
                >
                  <Mail className="size-4" />
                  {t('profile.changeEmail')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('profile.emailChangeHint')}
              </p>
            </div>

            {hasChanges && (
              <div className="flex justify-end gap-3 pt-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  className="h-12 rounded-xl"
                >
                  {t('profile.discard')}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="h-12 rounded-xl gap-2 shadow-lg shadow-primary/15"
                >
                  {mutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t('profile.saveChanges')}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
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
    <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
      {/* Section header with subtle gradient */}
      <div className="px-8 py-6 border-b border-border/40 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent">
        <div className="flex items-center gap-5">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-warm/15 to-warm/5 flex items-center justify-center border border-warm/10">
            <Palette className="size-5 text-warm" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('profile.preferences.title')}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t('profile.preferences.description')}</p>
          </div>
        </div>
      </div>

      {/* Appearance group */}
      <div className="px-8 py-6 border-b border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">{t('profile.preferences.appearance')}</p>
        <div className="space-y-2">
          <PreferenceRow
            icon={Palette}
            title={t('profile.preferences.theme')}
            description={t('profile.preferences.colorScheme')}
          >
            <Select
              value={profile.preferences.theme}
              onValueChange={(value) => updatePreference('theme', value as UserPreferences['theme'])}
            >
              <SelectTrigger className="w-36 h-10 text-sm rounded-xl">
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
              <SelectTrigger className="w-36 h-10 text-sm rounded-xl">
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
      <div className="px-8 py-6 border-b border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">{t('profile.preferences.workflow')}</p>
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
            <SelectTrigger className="w-44 h-10 text-sm rounded-xl">
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
      <div className="px-8 py-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">{t('profile.preferences.notifications')}</p>
        <div className="space-y-2">
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
              <SelectTrigger className="w-32 h-10 text-sm rounded-xl">
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
  );
}

// ============================================
// Account Info Card
// ============================================

function AccountInfoCard({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
          <div className="size-6 rounded-lg bg-muted/50 flex items-center justify-center">
            <Hash className="size-3.5 text-muted-foreground" />
          </div>
          {t('profile.accountDetails.title')}
        </h3>
      </div>

      <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
        <div className="divide-y divide-border/40">
          <InfoRow label={t('profile.accountDetails.userId')} value={profile.id} mono copyable />
          <InfoRow label={t('profile.emailAddress')} value={profile.email} />
          <InfoRow
            label={t('profile.accountDetails.role')}
            value={profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
            badge
          />
          <InfoRow
            label={t('profile.accountDetails.created')}
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
    </>
  );
}

// ============================================
// Quick Tips Card
// ============================================

function QuickTipsCard() {
  const { t } = useTranslation();
  const tips = [
    {
      icon: Zap,
      title: t('profile.quickTips.keyboardShortcuts'),
      description: t('profile.quickTips.keyboardShortcutsDesc'),
      color: 'text-primary',
      bg: 'from-primary/10 to-primary/5',
    },
    {
      icon: Key,
      title: t('profile.quickTips.apiKeys'),
      description: t('profile.quickTips.apiKeysDesc'),
      color: 'text-warm',
      bg: 'from-warm/10 to-warm/5',
    },
    {
      icon: Shield,
      title: t('profile.quickTips.security'),
      description: t('profile.quickTips.securityDesc'),
      color: 'text-success',
      bg: 'from-success/10 to-success/5',
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
          <div className="size-6 rounded-lg bg-success/10 flex items-center justify-center">
            <Sparkles className="size-3.5 text-success" />
          </div>
          {t('profile.quickTips.title')}
        </h3>
      </div>

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
              <div className="size-10 rounded-xl bg-card/80 flex items-center justify-center border border-border/40 shrink-0">
                <tip.icon className={cn('size-5', tip.color)} />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">{tip.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
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
      <DialogContent className="sm:max-w-[440px] border-0 shadow-2xl p-0 overflow-hidden gap-0">
        {/* Decorative gradient header */}
        <div className="relative h-32 bg-gradient-to-br from-info/20 via-info/10 to-transparent overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-info/30 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />

          {/* Centered icon with glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-info/40 rounded-3xl blur-xl scale-150" />
              <div className="relative size-20 rounded-3xl bg-gradient-to-br from-info/30 via-info/20 to-info/10 flex items-center justify-center border border-info/30 backdrop-blur-sm shadow-lg shadow-info/20">
                <Mail className="size-10 text-info" strokeWidth={1.5} />
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
                {t('profile.changeEmailDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                {t('profile.changeEmailDialog.description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/30 text-sm border border-border/40">
                <p className="text-muted-foreground">
                  {t('profile.changeEmailDialog.currentEmail')}{' '}
                  <span className="font-medium text-foreground">{currentEmail}</span>
                </p>
              </div>

              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">{t('profile.emailAddress')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('profile.changeEmailDialog.newEmailPlaceholder')}
                        className="h-12 rounded-xl"
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
                    <FormLabel className="text-sm font-medium">{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('profile.changeEmailDialog.passwordPlaceholder')}
                        className="h-12 rounded-xl"
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

              <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-12 rounded-xl"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 h-12 rounded-xl gap-2 shadow-lg shadow-primary/15"
                >
                  {mutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t('profile.changeEmailDialog.submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
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
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-info/20 rounded-3xl blur-2xl scale-125" />
          <div className="relative size-20 rounded-3xl bg-gradient-to-br from-info/20 to-info/5 flex items-center justify-center border border-info/20">
            <User className="size-10 text-info animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-3xl border-2 border-info/30 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground mb-1">{t('profile.loading')}</p>
          <p className="text-sm text-muted-foreground">{t('profile.loadingMessage')}</p>
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
        "flex items-center justify-between px-5 py-4",
        copyable && "cursor-pointer hover:bg-muted/30 transition-colors group"
      )}
      onClick={copyable ? handleCopy : undefined}
      title={copyable ? 'Click to copy' : undefined}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
          {value}
        </span>
      ) : (
        <span className={cn(
          'text-sm font-medium',
          mono && 'font-mono text-xs bg-muted/50 px-2.5 py-1 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors'
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
    <div className="flex items-center justify-between py-4 px-2 rounded-xl hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 border border-border/30">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
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
  const { t } = useTranslation();
  return (
    <div className="island overflow-hidden border-0 shadow-lg shadow-warning/[0.03] border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0 border border-warning/20">
            <AlertCircle className="size-6 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{t('profile.emailChangePending')}</p>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {t('profile.verificationSentTo')} <span className="font-medium text-foreground">{newEmail}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 h-10 rounded-xl text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={onCancel}
            >
              <X className="size-4" />
              {t('profile.cancelEmailChange')}
            </Button>
          </div>
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
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
