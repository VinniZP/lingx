'use client';

import { useAIConfigs } from '@/hooks/use-ai-translation';
import { useMTConfigs } from '@/hooks/use-machine-translation';
import { useProjectPermission } from '@/hooks/use-project-permission';
import { projectApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Gauge,
  Languages,
  Loader2,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use, useMemo } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default function SettingsLayout({ children, params }: LayoutProps) {
  const { projectId } = use(params);
  const pathname = usePathname();
  const { t } = useTranslation();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  // Get user's project permissions for nav filtering
  const { canManageSettings, isLoading: isLoadingPermissions } = useProjectPermission(projectId);

  const { data: mtConfigsData } = useMTConfigs(projectId);
  const mtConnectedCount = mtConfigsData?.configs?.filter((c) => c.isActive).length || 0;

  const { data: aiConfigsData } = useAIConfigs(projectId);
  const aiConnectedCount = aiConfigsData?.configs?.filter((c) => c.isActive).length || 0;

  // Determine active section from pathname
  const isGeneralActive = pathname === `/projects/${projectId}/settings`;
  const isIntegrationsActive = pathname === `/projects/${projectId}/settings/integrations`;
  const isAITranslationActive = pathname === `/projects/${projectId}/settings/ai-translation`;
  const isGlossaryActive = pathname === `/projects/${projectId}/settings/glossary`;
  const isQualityActive = pathname === `/projects/${projectId}/settings/quality`;
  const isMembersActive = pathname === `/projects/${projectId}/settings/members`;

  // Nav items with role requirements
  // requiresManager: true = OWNER or MANAGER only
  // requiresManager: false = visible to all project members
  // NOTE: useMemo must be called before any early returns to maintain hooks order
  const allNavItems = useMemo(
    () => [
      {
        href: `/projects/${projectId}/settings`,
        icon: Settings,
        label: t('projectSettings.layout.nav.general'),
        description: t('projectSettings.layout.nav.generalDescription'),
        isActive: isGeneralActive,
        badge: null,
        requiresManager: true,
      },
      {
        href: `/projects/${projectId}/settings/glossary`,
        icon: BookOpen,
        label: t('projectSettings.layout.nav.glossary'),
        description: t('projectSettings.layout.nav.glossaryDescription'),
        isActive: isGlossaryActive,
        badge: null,
        requiresManager: true,
      },
      {
        href: `/projects/${projectId}/settings/integrations`,
        icon: Languages,
        label: t('projectSettings.layout.nav.integrations'),
        description: t('projectSettings.layout.nav.integrationsDescription'),
        isActive: isIntegrationsActive,
        badge: mtConnectedCount > 0 ? `${mtConnectedCount}` : null,
        requiresManager: true,
      },
      {
        href: `/projects/${projectId}/settings/ai-translation`,
        icon: Sparkles,
        label: 'AI Translation',
        description: 'Configure AI providers for context-aware translations',
        isActive: isAITranslationActive,
        badge: aiConnectedCount > 0 ? `${aiConnectedCount}` : null,
        requiresManager: true,
      },
      {
        href: `/projects/${projectId}/settings/quality`,
        icon: Gauge,
        label: 'Quality Scoring',
        description: 'AI-powered translation quality evaluation',
        isActive: isQualityActive,
        badge: null,
        requiresManager: true,
      },
      {
        href: `/projects/${projectId}/settings/members`,
        icon: Users,
        label: t('projectSettings.layout.nav.team'),
        description: t('projectSettings.layout.nav.teamDescription'),
        isActive: isMembersActive,
        badge: null,
        requiresManager: false, // Visible to all members
      },
    ],
    [
      projectId,
      t,
      isGeneralActive,
      isGlossaryActive,
      isIntegrationsActive,
      isAITranslationActive,
      isQualityActive,
      isMembersActive,
      mtConnectedCount,
      aiConnectedCount,
    ]
  );

  // Filter nav items based on user's permissions
  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.requiresManager || canManageSettings),
    [allNavItems, canManageSettings]
  );

  // Loading state - must be after all hooks to maintain hooks order
  if (isLoading || isLoadingPermissions) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="from-primary/20 to-primary/5 size-16 animate-pulse rounded-2xl bg-linear-to-br" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-primary size-6 animate-spin" />
            </div>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium">{t('projectSettings.layout.loadingSettings')}</p>
            <p className="text-muted-foreground text-xs">{t('common.pleaseWait')}</p>
          </div>
        </div>
      </div>
    );
  }

  const comingSoonItems = [
    {
      icon: Shield,
      label: t('projectSettings.layout.nav.security'),
      description: t('projectSettings.layout.nav.securityDescription'),
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Header with Depth */}
      <div className="border-border/40 relative overflow-hidden border-b">
        {/* Subtle gradient background */}
        <div className="from-primary/[0.02] absolute inset-0 bg-linear-to-br via-transparent to-transparent" />
        <div className="from-primary/[0.03] absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-bl to-transparent blur-3xl" />

        <div className="relative container max-w-6xl py-8">
          <div className="flex items-start gap-6">
            {/* Back Button */}
            <Link
              href={`/projects/${projectId}`}
              className="bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border mt-1 inline-flex size-10 items-center justify-center rounded-xl border transition-all duration-200 hover:shadow-sm"
            >
              <ArrowLeft className="size-4" />
            </Link>

            {/* Title Section */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-3">
                <div className="from-primary/15 to-primary/5 border-primary/10 flex size-11 items-center justify-center rounded-xl border bg-linear-to-br shadow-sm">
                  <Settings className="text-primary size-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {t('projectSettings.layout.title')}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {t('projectSettings.layout.subtitle', { projectName: project?.name || '' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation - Fixed width, elegant styling */}
          <div className="w-64 shrink-0">
            <nav className="sticky top-8 space-y-6">
              {/* Active Navigation */}
              <div className="space-y-1.5">
                <p className="text-muted-foreground/70 mb-3 px-3 text-[11px] font-semibold tracking-widest uppercase">
                  {t('projectSettings.layout.configure')}
                </p>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                        item.isActive
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-9 items-center justify-center rounded-lg transition-all duration-200',
                          item.isActive
                            ? 'bg-primary/15 shadow-sm'
                            : 'bg-muted/50 group-hover:bg-muted'
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4.5 transition-colors',
                            item.isActive
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'mb-0.5 text-sm leading-none font-medium',
                            item.isActive && 'text-primary'
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {item.description}
                        </p>
                      </div>
                      {item.badge && (
                        <span className="bg-success/15 text-success border-success/20 rounded-md border px-2 py-0.5 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="from-border/60 via-border/30 mx-3 h-px bg-linear-to-r to-transparent" />

              {/* Coming Soon */}
              <div className="space-y-1.5">
                <p className="text-muted-foreground/70 mb-3 px-3 text-[11px] font-semibold tracking-widest uppercase">
                  {t('projectSettings.layout.comingSoon')}
                </p>

                {comingSoonItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5"
                    >
                      <div className="bg-muted/30 flex size-9 items-center justify-center rounded-lg">
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm leading-none font-medium">{item.label}</p>
                          <Sparkles className="text-primary/40 size-3" />
                        </div>
                        <p className="mt-0.5 truncate text-[11px]">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Help Card */}
              <div className="from-muted/50 to-muted/20 border-border/40 mx-1 rounded-xl border bg-linear-to-br p-4">
                <p className="mb-1 text-xs font-medium">{t('projectSettings.layout.needHelp')}</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {t('projectSettings.layout.needHelpDescription')}
                </p>
              </div>
            </nav>
          </div>

          {/* Page Content - Generous space */}
          <div className="max-w-3xl min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
