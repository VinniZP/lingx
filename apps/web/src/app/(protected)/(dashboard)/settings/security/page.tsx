'use client';

import { useAuth } from '@/lib/auth';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Activity, Lock, Shield, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  SettingsBackdrop,
  SettingsBackLink,
  SettingsLoadingState,
  SettingsPageHeader,
  SettingsSectionHeader,
} from '../_components';
import {
  PasskeyCard,
  PasswordChangeForm,
  SecurityChecklist,
  SecurityScoreWidget,
  SecurityTips,
  SessionsList,
  TwoFactorCard,
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
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Column - Main Security Features */}
        <div className="space-y-8 lg:col-span-7 xl:col-span-8">
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
              <div className="border-border/40 from-muted/40 via-muted/20 border-b bg-linear-to-r to-transparent px-8 py-6">
                <div className="flex items-center gap-5">
                  <div className="from-primary/15 to-primary/5 border-primary/10 flex size-12 items-center justify-center rounded-2xl border bg-linear-to-br">
                    <Lock className="text-primary size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t('security.changePassword.title')}
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-sm">
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
        <div className="space-y-8 lg:col-span-5 xl:col-span-4">
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
