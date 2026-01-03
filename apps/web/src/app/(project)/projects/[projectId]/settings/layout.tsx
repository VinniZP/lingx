'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@lingx/sdk-nextjs';
import { projectApi } from '@/lib/api';
import {
  ArrowLeft,
  Settings,
  Languages,
  BookOpen,
  Users,
  Shield,
  Loader2,
  Sparkles,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMTConfigs } from '@/hooks/use-machine-translation';
import { useAIConfigs } from '@/hooks/use-ai-translation';

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="size-16 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">{t('projectSettings.layout.loadingSettings')}</p>
            <p className="text-xs text-muted-foreground">{t('common.pleaseWait')}</p>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      href: `/projects/${projectId}/settings`,
      icon: Settings,
      label: t('projectSettings.layout.nav.general'),
      description: t('projectSettings.layout.nav.generalDescription'),
      isActive: isGeneralActive,
      badge: null,
    },
    {
      href: `/projects/${projectId}/settings/glossary`,
      icon: BookOpen,
      label: t('projectSettings.layout.nav.glossary'),
      description: t('projectSettings.layout.nav.glossaryDescription'),
      isActive: isGlossaryActive,
      badge: null,
    },
    {
      href: `/projects/${projectId}/settings/integrations`,
      icon: Languages,
      label: t('projectSettings.layout.nav.integrations'),
      description: t('projectSettings.layout.nav.integrationsDescription'),
      isActive: isIntegrationsActive,
      badge: mtConnectedCount > 0 ? `${mtConnectedCount}` : null,
    },
    {
      href: `/projects/${projectId}/settings/ai-translation`,
      icon: Sparkles,
      label: 'AI Translation',
      description: 'Configure AI providers for context-aware translations',
      isActive: isAITranslationActive,
      badge: aiConnectedCount > 0 ? `${aiConnectedCount}` : null,
    },
    {
      href: `/projects/${projectId}/settings/quality`,
      icon: Gauge,
      label: 'Quality Scoring',
      description: 'AI-powered translation quality evaluation',
      isActive: isQualityActive,
      badge: null,
    },
  ];

  const comingSoonItems = [
    { icon: Users, label: t('projectSettings.layout.nav.team'), description: t('projectSettings.layout.nav.teamDescription') },
    { icon: Shield, label: t('projectSettings.layout.nav.security'), description: t('projectSettings.layout.nav.securityDescription') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header with Depth */}
      <div className="relative overflow-hidden border-b border-border/40">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/[0.02] via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/[0.03] to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative container max-w-6xl py-8">
          <div className="flex items-start gap-6">
            {/* Back Button */}
            <Link
              href={`/projects/${projectId}`}
              className="mt-1 inline-flex items-center justify-center size-10 rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:shadow-sm transition-all duration-200"
            >
              <ArrowLeft className="size-4" />
            </Link>

            {/* Title Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="size-11 rounded-xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center shadow-sm">
                  <Settings className="size-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {t('projectSettings.layout.title')}
                  </h1>
                  <p className="text-sm text-muted-foreground">
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
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3 mb-3">
                  {t('projectSettings.layout.configure')}
                </p>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                        item.isActive
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'size-9 rounded-lg flex items-center justify-center transition-all duration-200',
                        item.isActive
                          ? 'bg-primary/15 shadow-sm'
                          : 'bg-muted/50 group-hover:bg-muted'
                      )}>
                        <Icon className={cn(
                          'size-4.5 transition-colors',
                          item.isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium leading-none mb-0.5',
                          item.isActive && 'text-primary'
                        )}>
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-success/15 text-success border border-success/20">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-px bg-linear-to-r from-border/60 via-border/30 to-transparent mx-3" />

              {/* Coming Soon */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3 mb-3">
                  {t('projectSettings.layout.comingSoon')}
                </p>

                {comingSoonItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/50 cursor-not-allowed"
                    >
                      <div className="size-9 rounded-lg bg-muted/30 flex items-center justify-center">
                        <Icon className="size-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none">
                            {item.label}
                          </p>
                          <Sparkles className="size-3 text-primary/40" />
                        </div>
                        <p className="text-[11px] truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Help Card */}
              <div className="mx-1 p-4 rounded-xl bg-linear-to-br from-muted/50 to-muted/20 border border-border/40">
                <p className="text-xs font-medium mb-1">{t('projectSettings.layout.needHelp')}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('projectSettings.layout.needHelpDescription')}
                </p>
              </div>
            </nav>
          </div>

          {/* Page Content - Generous space */}
          <div className="flex-1 min-w-0 max-w-3xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
