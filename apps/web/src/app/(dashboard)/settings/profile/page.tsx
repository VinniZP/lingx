'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useAuth } from '@/lib/auth';
import { User, Camera } from 'lucide-react';
import { useRelativeTime } from '@/hooks/use-relative-time';
import {
  SettingsBackdrop,
  SettingsBackLink,
  SettingsPageHeader,
  SettingsLoadingState,
} from '../_components';
import {
  AvatarUpload,
  ProfileForm,
  PreferencesForm,
  AccountInfoCard,
  EmailChangeDialog,
  ProfileSummaryWidget,
  QuickTipsCard,
  PendingEmailChange,
  useProfile,
  useProjects,
  useCancelEmailChange,
} from './_components';

export default function ProfileSettingsPage() {
  const { t } = useTranslation();
  const { isManager, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { formatRelativeTime } = useRelativeTime();

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.push('/projects');
    }
  }, [isManager, authLoading, router]);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: projectsData } = useProjects();
  const cancelEmailChangeMutation = useCancelEmailChange();

  if (authLoading || profileLoading) {
    return (
      <SettingsLoadingState
        icon={User}
        title={t('profile.loading')}
        subtitle={t('profile.loadingMessage')}
        accentColor="info"
      />
    );
  }

  if (!isManager || !profile) {
    return null;
  }

  const memberDuration = profile.createdAt
    ? formatRelativeTime(new Date(profile.createdAt))
    : 'Just joined';

  // Role badge component
  const roleBadge = (
    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
      {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
    </span>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-16">
      <SettingsBackdrop accentColor="info" />
      <SettingsBackLink />

      <SettingsPageHeader
        icon={User}
        title={t('profile.title')}
        description={t('profile.description')}
        accentColor="info"
        badges={roleBadge}
        widget={
          <ProfileSummaryWidget
            profile={profile}
            memberDuration={memberDuration}
          />
        }
      />

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:gap-10 lg:grid-cols-12">
        {/* Left Column - Main Forms */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Avatar & Basic Info Card */}
          <section className="animate-fade-in-up stagger-2">
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              {/* Section header with subtle gradient */}
              <div className="px-8 py-6 border-b border-border/40 bg-linear-to-r from-muted/40 via-muted/20 to-transparent">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-2xl bg-linear-to-br from-info/15 to-info/5 flex items-center justify-center border border-info/10">
                    <Camera className="size-5 text-info" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t('profile.avatar')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t('profile.avatarDescription')}
                    </p>
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
                onCancel={() => cancelEmailChangeMutation.mutate()}
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
