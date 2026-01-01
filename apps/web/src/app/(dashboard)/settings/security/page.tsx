'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { useAuth } from '@/lib/auth';
import { Shield, Lock, Activity, ShieldCheck } from 'lucide-react';
import {
  SettingsBackdrop,
  SettingsBackLink,
  SettingsPageHeader,
  SettingsSectionHeader,
  SettingsLoadingState,
} from '../_components';
import {
  SecurityScoreWidget,
  TwoFactorCard,
  PasskeyCard,
  PasswordChangeForm,
  SessionsList,
  SecurityChecklist,
  SecurityTips,
} from './_components';

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
    return (
      <SettingsLoadingState
        icon={Shield}
        title={t('security.loading')}
        subtitle="Please wait..."
        accentColor="primary"
      />
    );
  }

  if (!isManager) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-16">
      <SettingsBackdrop accentColor="primary" />
      <SettingsBackLink />

      <SettingsPageHeader
        icon={Shield}
        title={t('security.title')}
        description={t('security.description')}
        accentColor="primary"
        widget={<SecurityScoreWidget />}
      />

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
            <div className="island overflow-hidden border-0 shadow-lg shadow-black/2">
              {/* Section header with subtle gradient */}
              <div className="px-8 py-6 border-b border-border/40 bg-linear-to-r from-muted/40 via-muted/20 to-transparent">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-2xl bg-linear-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                    <Lock className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t('security.changePassword.title')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t('security.changePassword.description')}
                    </p>
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
            <SettingsSectionHeader
              icon={Activity}
              title={t('security.activeSessions.title')}
              iconVariant="muted"
            />
            <SessionsList />
          </section>

          {/* Security Checklist */}
          <section className="animate-fade-in-up stagger-6">
            <SettingsSectionHeader
              icon={ShieldCheck}
              title={t('security.securityChecklist')}
              iconVariant="success"
            />
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
