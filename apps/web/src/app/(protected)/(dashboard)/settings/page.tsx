'use client';

import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  Key,
  Lock,
  Mail,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="bg-primary/20 absolute inset-0 scale-125 rounded-3xl blur-2xl" />
            <div className="from-primary/20 to-primary/5 border-primary/20 relative flex size-20 items-center justify-center rounded-3xl border bg-linear-to-br">
              <Settings className="text-primary size-10 animate-pulse" />
            </div>
            <div
              className="border-primary/30 absolute inset-0 animate-ping rounded-3xl border-2"
              style={{ animationDuration: '2s' }}
            />
          </div>
          <div className="text-center">
            <p className="text-foreground mb-1 font-medium">{t('common.loading')}</p>
            <p className="text-muted-foreground text-sm">{t('common.pleaseWait')}</p>
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
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Primary gradient orb */}
        <div
          className="from-primary/[0.08] via-primary/[0.04] absolute top-0 right-0 h-[1000px] w-[1000px] translate-x-1/3 -translate-y-1/3 animate-pulse rounded-full bg-gradient-to-bl to-transparent blur-3xl"
          style={{ animationDuration: '8s' }}
        />
        {/* Warm accent orb */}
        <div className="from-warm/[0.06] via-warm/[0.02] absolute bottom-0 left-0 h-[800px] w-[800px] -translate-x-1/3 translate-y-1/3 rounded-full bg-gradient-to-tr to-transparent blur-3xl" />
        {/* Floating center orb */}
        <div
          className="from-info/[0.04] to-primary/[0.04] absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-linear-to-r blur-3xl"
          style={{ animationDuration: '12s' }}
        />
        {/* Refined grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Premium Hero Section */}
      <div className="animate-fade-in-up relative mb-12">
        <div className="island shadow-primary/[0.03] overflow-hidden border-0 shadow-lg">
          {/* Gradient accent band */}
          <div className="from-primary via-primary/70 to-warm h-1.5 bg-linear-to-r" />

          <div className="p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
              {/* Avatar with premium glow effect */}
              <div className="relative shrink-0">
                <div className="bg-primary/25 absolute inset-0 scale-110 rounded-3xl blur-2xl" />
                <div className="from-primary/30 to-warm/20 absolute inset-0 rounded-3xl bg-linear-to-br blur-xl" />
                <div className="from-primary/20 via-primary/10 to-warm/10 border-primary/20 relative flex size-24 items-center justify-center overflow-hidden rounded-3xl border bg-linear-to-br backdrop-blur-sm lg:size-28">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'Avatar'}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-primary text-3xl font-semibold lg:text-4xl">
                      {initials}
                    </span>
                  )}
                  <Sparkles className="text-primary absolute -top-1 -right-1 size-5 animate-pulse" />
                </div>
                {/* Status badge */}
                <div className="bg-success border-card absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-xl border-4 shadow-lg">
                  <ShieldCheck className="text-success-foreground size-4" />
                </div>
              </div>

              {/* User Info */}
              <div className="min-w-0 flex-1">
                <h1 className="from-foreground to-foreground/70 mb-2 bg-linear-to-br bg-clip-text text-3xl font-semibold tracking-tight lg:text-4xl">
                  {user?.name || t('settings.title')}
                </h1>
                <div className="text-muted-foreground flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 shrink-0" />
                    <span className="truncate text-sm">{user?.email}</span>
                  </div>
                  <span className="text-border hidden sm:block">•</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 shrink-0" />
                    <span className="text-sm">
                      {t('settings.joined')} {joinDate}
                    </span>
                  </div>
                </div>

                {/* Account status badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="bg-success/15 text-success border-success/20 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
                    {t('common.active')}
                  </span>
                  <span className="bg-primary/15 text-primary border-primary/20 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
                    {user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'User'}
                  </span>
                </div>
              </div>

              {/* Quick Stats Widget */}
              <div className="from-muted/50 to-muted/20 border-border/50 min-w-[200px] shrink-0 rounded-2xl border bg-linear-to-br p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-primary/10 flex size-10 items-center justify-center rounded-xl">
                    <Zap className="text-primary size-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      {t('settings.accountHealth')}
                    </p>
                    <p className="text-success text-lg font-bold">{t('settings.excellent')}</p>
                  </div>
                </div>
                <div className="bg-muted/50 h-2 overflow-hidden rounded-full">
                  <div className="from-success to-success/70 h-full w-[85%] rounded-full bg-linear-to-r" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Column - Settings Cards */}
        <div className="space-y-8 lg:col-span-7 xl:col-span-8">
          {/* Account Settings Section */}
          <section className="animate-fade-in-up stagger-1">
            <div className="mb-5 flex items-center justify-between px-1">
              <h3 className="text-foreground flex items-center gap-2.5 text-sm font-semibold tracking-tight">
                <div className="bg-primary/10 flex size-6 items-center justify-center rounded-lg">
                  <Settings className="text-primary size-3.5" />
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
        <div className="space-y-8 lg:col-span-5 xl:col-span-4">
          {/* Security Tips */}
          <section className="animate-fade-in-up stagger-2">
            <div className="mb-5 flex items-center justify-between px-1">
              <h3 className="text-foreground flex items-center gap-2.5 text-sm font-semibold tracking-tight">
                <div className="bg-success/10 flex size-6 items-center justify-center rounded-lg">
                  <ShieldCheck className="text-success size-3.5" />
                </div>
                {t('settings.tips.title')}
              </h3>
            </div>

            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              <div className="divide-border/40 divide-y">
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
            <div className="mb-5 flex items-center justify-between px-1">
              <h3 className="text-foreground flex items-center gap-2.5 text-sm font-semibold tracking-tight">
                <div className="bg-info/10 flex size-6 items-center justify-center rounded-lg">
                  <BookOpen className="text-info size-3.5" />
                </div>
                {t('settings.resources.title')}
              </h3>
            </div>

            <div className="island overflow-hidden border-0 shadow-lg shadow-black/[0.02]">
              <div className="divide-border/40 divide-y">
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
        'island group overflow-hidden border-0 shadow-lg shadow-black/[0.02] transition-all duration-300',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[0.04]'
      )}
    >
      <div className="flex items-center gap-5 p-6">
        {/* Icon with gradient background */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'absolute inset-0 rounded-2xl opacity-50 blur-lg',
              gradientFrom.replace('from-', 'bg-')
            )}
          />
          <div
            className={cn(
              'relative flex size-14 items-center justify-center rounded-2xl border bg-linear-to-br backdrop-blur-sm transition-transform',
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-semibold">{title}</h3>
            {comingSoon && (
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">{description}</p>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            'text-muted-foreground/40 size-5 shrink-0 transition-all duration-300',
            !disabled && 'group-hover:text-primary group-hover:translate-x-1'
          )}
        />
      </div>
    </div>
  );

  if (disabled) {
    return <div className="block">{content}</div>;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
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
    warning: {
      icon: 'text-warning',
      bg: 'from-warning/15 to-warning/5',
      border: 'border-warning/20',
    },
    info: { icon: 'text-info', bg: 'from-info/15 to-info/5', border: 'border-info/20' },
  };

  const colors = statusColors[status];

  return (
    <div className="flex items-start gap-4 p-5">
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl border bg-linear-to-br',
          colors.bg,
          colors.border
        )}
      >
        <Icon className={cn('size-5', colors.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          {comingSoon && (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
              Soon
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
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
      className="hover:bg-muted/20 group flex items-center gap-4 p-5 transition-colors"
    >
      <div className="bg-muted/40 group-hover:bg-primary/10 border-border/30 group-hover:border-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors">
        <BookOpen className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="group-hover:text-primary text-sm font-semibold transition-colors">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      </div>
      <ExternalLink className="text-muted-foreground/40 group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
    </a>
  );
}
