'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useAuth } from '@/lib/auth';
import {
  Key,
  Shield,
  User,
  Mail,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Lock,
  Settings,
  Sparkles,
  ExternalLink,
  Zap,
  BookOpen,
  Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SettingsPage - Premium redesigned settings hub
 *
 * Features:
 * - Premium atmospheric backdrop with gradient orbs
 * - Hero section with glowing avatar and user stats
 * - Premium action cards with gradient icons
 * - Security tips sidebar with status indicators
 * - Consistent premium styling matching Profile/API Keys pages
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl scale-125" />
            <div className="relative size-20 rounded-3xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Settings className="size-10 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-3xl border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground mb-1">{t('common.loading')}</p>
            <p className="text-sm text-muted-foreground">{t('common.pleaseWait')}</p>
          </div>
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
    <div className="min-h-[calc(100vh-8rem)] pb-16">
      {/* Premium atmospheric backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-bl from-primary/[0.08] via-primary/[0.04] to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 animate-pulse" style={{ animationDuration: '8s' }} />
        {/* Warm accent orb */}
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-to-tr from-warm/[0.06] via-warm/[0.02] to-transparent rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        {/* Floating center orb */}
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-linear-to-r from-info/[0.04] to-primary/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '12s' }} />
        {/* Refined grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Premium Hero Section */}
      <div className="relative mb-12 animate-fade-in-up">
        <div className="island overflow-hidden border-0 shadow-lg shadow-primary/[0.03]">
          {/* Gradient accent band */}
          <div className="h-1.5 bg-linear-to-r from-primary via-primary/70 to-warm" />

          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              {/* Avatar with premium glow effect */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary/25 rounded-3xl blur-2xl scale-110" />
                <div className="absolute inset-0 bg-linear-to-br from-primary/30 to-warm/20 rounded-3xl blur-xl" />
                <div className="relative size-24 lg:size-28 rounded-3xl bg-linear-to-br from-primary/20 via-primary/10 to-warm/10 flex items-center justify-center border border-primary/20 backdrop-blur-sm overflow-hidden">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'Avatar'}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl lg:text-4xl font-semibold text-primary">
                      {initials}
                    </span>
                  )}
                  <Sparkles className="absolute -top-1 -right-1 size-5 text-primary animate-pulse" />
                </div>
                {/* Status badge */}
                <div className="absolute -bottom-2 -right-2 size-8 rounded-xl bg-success flex items-center justify-center border-4 border-card shadow-lg">
                  <ShieldCheck className="size-4 text-success-foreground" />
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-2 bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
                  {user?.name || t('settings.title')}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 shrink-0" />
                    <span className="text-sm truncate">{user?.email}</span>
                  </div>
                  <span className="hidden sm:block text-border">•</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 shrink-0" />
                    <span className="text-sm">{t('settings.joined')} {joinDate}</span>
                  </div>
                </div>

                {/* Account status badges */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/20">
                    {t('common.active')}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'User'}
                  </span>
                </div>
              </div>

              {/* Quick Stats Widget */}
              <div className="shrink-0 p-6 rounded-2xl bg-linear-to-br from-muted/50 to-muted/20 border border-border/50 min-w-[200px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('settings.accountHealth')}</p>
                    <p className="text-lg font-bold text-success">{t('settings.excellent')}</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full w-[85%] rounded-full bg-linear-to-r from-success to-success/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:gap-10 lg:grid-cols-12">
        {/* Left Column - Settings Cards */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Account Settings Section */}
          <section className="animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="size-3.5 text-primary" />
                </div>
                {t('settings.accountSettings')}
              </h3>
            </div>

            <div className="space-y-4">
              <SettingsActionCard
                href="/settings/api-keys"
                icon={Key}
                gradientFrom="from-warm/20"
                gradientTo="to-warm/5"
                borderColor="border-warm/20"
                iconColor="text-warm"
                title={t('settings.apiKeys.title')}
                description={t('settings.apiKeys.description')}
              />
              <SettingsActionCard
                href="/settings/security"
                icon={Shield}
                gradientFrom="from-primary/20"
                gradientTo="to-primary/5"
                borderColor="border-primary/20"
                iconColor="text-primary"
                title={t('settings.security.title')}
                description={t('settings.security.description')}
              />
              <SettingsActionCard
                href="/settings/profile"
                icon={User}
                gradientFrom="from-info/20"
                gradientTo="to-info/5"
                borderColor="border-info/20"
                iconColor="text-info"
                title={t('settings.profile.title')}
                description={t('settings.profile.description')}
              />
            </div>
          </section>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
          {/* Security Tips */}
          <section className="animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-success/10 flex items-center justify-center">
                  <ShieldCheck className="size-3.5 text-success" />
                </div>
                {t('settings.tips.title')}
              </h3>
            </div>

            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              <div className="divide-y divide-border/40">
                <SecurityTip
                  icon={Fingerprint}
                  status="good"
                  title={t('settings.tips.strongPassword')}
                  description={t('settings.tips.strongPasswordDesc')}
                />
                <SecurityTip
                  icon={Key}
                  status="info"
                  title={t('settings.tips.apiKeyRotation')}
                  description={t('settings.tips.apiKeyRotationDesc')}
                />
                <SecurityTip
                  icon={Lock}
                  status="good"
                  title={t('settings.tips.activeSessions')}
                  description={t('settings.tips.activeSessionsDesc')}
                />
              </div>
            </div>
          </section>

          {/* Resources */}
          <section className="animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
                <div className="size-6 rounded-lg bg-info/10 flex items-center justify-center">
                  <BookOpen className="size-3.5 text-info" />
                </div>
                {t('settings.resources.title')}
              </h3>
            </div>

            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              <div className="divide-y divide-border/40">
                <ResourceLink
                  href="https://docs.lingx.dev"
                  title={t('settings.resources.docs')}
                  description={t('settings.resources.docsDesc')}
                />
                <ResourceLink
                  href="https://docs.lingx.dev/api"
                  title={t('settings.resources.api')}
                  description={t('settings.resources.apiDesc')}
                />
                <ResourceLink
                  href="https://docs.lingx.dev/cli"
                  title={t('settings.resources.cliGuide')}
                  description={t('settings.resources.cliGuideDesc')}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsActionCard - Premium settings navigation card with gradient styling
 */
function SettingsActionCard({
  href,
  icon: Icon,
  gradientFrom,
  gradientTo,
  borderColor,
  iconColor,
  title,
  description,
  disabled = false,
  comingSoon = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  iconColor: string;
  title: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  const content = (
    <div
      className={cn(
        'island overflow-hidden border-0 shadow-lg shadow-black/[0.02] group transition-all duration-300',
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-0.5'
      )}
    >
      <div className="p-6 flex items-center gap-5">
        {/* Icon with gradient background */}
        <div className="relative shrink-0">
          <div className={cn(
            'absolute inset-0 rounded-2xl blur-lg opacity-50',
            gradientFrom.replace('from-', 'bg-')
          )} />
          <div
            className={cn(
              'relative size-14 rounded-2xl flex items-center justify-center bg-linear-to-br border backdrop-blur-sm transition-transform',
              gradientFrom,
              gradientTo,
              borderColor,
              !disabled && 'group-hover:scale-105'
            )}
          >
            <Icon className={cn('size-6', iconColor)} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-lg">{title}</h3>
            {comingSoon && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {description}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            'size-5 text-muted-foreground/40 shrink-0 transition-all duration-300',
            !disabled && 'group-hover:text-primary group-hover:translate-x-1'
          )}
        />
      </div>
    </div>
  );

  if (disabled) {
    return <div className="block">{content}</div>;
  }

  return <Link href={href} className="block">{content}</Link>;
}

/**
 * SecurityTip - Security recommendation with premium styling
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
    good: { icon: 'text-success', bg: 'from-success/15 to-success/5', border: 'border-success/20' },
    warning: { icon: 'text-warning', bg: 'from-warning/15 to-warning/5', border: 'border-warning/20' },
    info: { icon: 'text-info', bg: 'from-info/15 to-info/5', border: 'border-info/20' },
  };

  const colors = statusColors[status];

  return (
    <div className="p-5 flex items-start gap-4">
      <div className={cn(
        'size-10 rounded-xl flex items-center justify-center shrink-0 bg-linear-to-br border',
        colors.bg,
        colors.border
      )}>
        <Icon className={cn('size-5', colors.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{title}</p>
          {comingSoon && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
              Soon
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/**
 * ResourceLink - External resource link with premium styling
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
      className="p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors group"
    >
      <div className="size-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors border border-border/30 group-hover:border-primary/20">
        <BookOpen className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <ExternalLink className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </a>
  );
}
