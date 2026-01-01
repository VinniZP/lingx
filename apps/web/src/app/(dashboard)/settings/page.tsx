'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Key,
  Shield,
  User,
  Mail,
  Calendar,
  ChevronRight,
  Fingerprint,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SettingsPage - Premium redesigned settings hub
 *
 * Features:
 * - Hero section with user profile and account summary
 * - Quick action cards matching project page pattern
 * - Security recommendations section
 * - Consistent premium styling with design system
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, isManager, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isManager) {
      router.push('/projects');
    }
  }, [isManager, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return null;
  }

  // Format join date nicely
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently';

  // Get user initials for avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="island p-6 lg:p-8 animate-fade-in-up">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-warm/10 flex items-center justify-center border border-primary/20">
              <span className="text-2xl font-semibold text-primary">
                {initials}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 size-6 rounded-lg bg-success flex items-center justify-center border-2 border-card">
              <ShieldCheck className="size-3.5 text-success-foreground" />
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
              {user?.name || t('settings.title')}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
          </div>

          {/* Account Stats */}
          <div className="flex items-center gap-6 sm:gap-8 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border sm:pl-8">
            <StatPill
              icon={Calendar}
              label="Joined"
              value={joinDate}
            />
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Content - Settings Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Settings Section */}
          <div className="space-y-3 animate-fade-in-up stagger-2">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              {t('settings.title')}
            </h2>
            <div className="space-y-3">
              <SettingsActionCard
                href="/settings/api-keys"
                icon={Key}
                iconBg="bg-warm/10"
                iconColor="text-warm"
                title={t('settings.apiKeys.title')}
                description={t('settings.apiKeys.description')}
              />
              <SettingsActionCard
                href="/settings/security"
                icon={Shield}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                title={t('settings.security.title')}
                description={t('settings.security.description')}
              />
              <SettingsActionCard
                href="/settings/profile"
                icon={User}
                iconBg="bg-info/10"
                iconColor="text-info"
                title={t('settings.profile.title')}
                description={t('settings.profile.description')}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security Tips */}
          <div className="space-y-3 animate-fade-in-up stagger-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              {t('settings.tips.title')}
            </h2>
            <div className="island divide-y divide-border">
              <div className="p-4">
                <SecurityTip
                  icon={Fingerprint}
                  status="good"
                  title={t('settings.tips.strongPassword')}
                  description={t('settings.tips.strongPasswordDesc')}
                />
              </div>
              <div className="p-4">
                <SecurityTip
                  icon={Key}
                  status="info"
                  title={t('settings.tips.apiKeyRotation')}
                  description={t('settings.tips.apiKeyRotationDesc')}
                />
              </div>
              <div className="p-4">
                <SecurityTip
                  icon={Lock}
                  status="warning"
                  title={t('settings.tips.twoFactorAuth')}
                  description={t('settings.tips.twoFactorAuthDesc')}
                  comingSoon
                />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 animate-fade-in-up stagger-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              {t('settings.resources.title')}
            </h2>
            <div className="island divide-y divide-border">
              <ResourceLink
                href="https://docs.localeflow.dev"
                title={t('settings.resources.docs')}
                description={t('settings.resources.docsDesc')}
              />
              <ResourceLink
                href="https://docs.localeflow.dev/api"
                title={t('settings.resources.api')}
                description={t('settings.resources.apiDesc')}
              />
              <ResourceLink
                href="https://docs.localeflow.dev/cli"
                title={t('settings.resources.cliGuide')}
                description={t('settings.resources.cliGuideDesc')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * StatPill - Compact stat display with icon
 */
function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center sm:text-left">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="size-3.5" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-medium">{value}</p>
    </div>
  );
}

/**
 * SettingsActionCard - Premium settings navigation card
 */
function SettingsActionCard({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  disabled = false,
  comingSoon = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  const content = (
    <div
      className={cn(
        'island p-5 group flex items-center gap-4 transition-all',
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'card-hover cursor-pointer'
      )}
    >
      <div
        className={cn(
          'size-12 rounded-xl flex items-center justify-center shrink-0 transition-transform',
          iconBg,
          !disabled && 'group-hover:scale-105'
        )}
      >
        <Icon className={cn('size-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          {comingSoon && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
          {description}
        </p>
      </div>
      <ChevronRight
        className={cn(
          'size-5 text-muted-foreground/50 shrink-0 transition-all',
          !disabled && 'group-hover:text-primary group-hover:translate-x-0.5'
        )}
      />
    </div>
  );

  if (disabled) {
    return <div className="block">{content}</div>;
  }

  return <Link href={href} className="block">{content}</Link>;
}

/**
 * SecurityTip - Individual security recommendation
 */
function SecurityTip({
  icon: Icon,
  status,
  title,
  description,
  comingSoon = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  status: 'good' | 'warning' | 'info';
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  const statusColors = {
    good: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-info bg-info/10',
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'size-8 rounded-lg flex items-center justify-center shrink-0',
          statusColors[status]
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{title}</p>
          {comingSoon && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-muted text-muted-foreground">
              Soon
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/**
 * ResourceLink - External resource link
 */
function ResourceLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 hover:bg-accent/50 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm group-hover:text-primary transition-colors">
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </a>
  );
}
