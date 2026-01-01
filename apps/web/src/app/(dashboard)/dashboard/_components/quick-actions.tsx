'use client';

import Link from 'next/link';
import { Upload, Key, GitBranch, Users, Terminal } from 'lucide-react';
import { useTranslation } from '@localeflow/sdk-nextjs';

interface QuickActionsProps {
  isManager: boolean;
}

export function QuickActions({ isManager }: QuickActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="lg:col-span-3 space-y-6">
      <div className="space-y-3 animate-fade-in-up stagger-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          {t('dashboard.quickActions')}
        </h2>
        <div className="space-y-3">
          <QuickActionLink
            href="/projects"
            icon={Upload}
            title={t('dashboard.import.title')}
            description={t('dashboard.import.formats')}
          />

          {isManager && (
            <QuickActionLink
              href="/settings/api-keys"
              icon={Key}
              title={t('dashboard.apiKeys.title')}
              description={t('dashboard.apiKeys.description')}
            />
          )}

          <QuickActionLink
            href="/projects"
            icon={GitBranch}
            title={t('dashboard.branches.title')}
            description={t('dashboard.branches.description')}
          />

          <QuickActionLink
            href="/projects"
            icon={Users}
            title={t('dashboard.team.title')}
            description={t('dashboard.team.description')}
          />
        </div>
      </div>

      {/* Integration hint */}
      <div className="island p-4 bg-primary/5 border border-primary/10 animate-fade-in-up stagger-4">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Terminal className="size-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{t('dashboard.cli.title')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('dashboard.cli.description')}
            </p>
            <code className="text-[10px] font-mono text-primary/70 mt-2 block">
              {t('dashboard.cli.command')}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuickActionLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function QuickActionLink({ href, icon: Icon, title, description }: QuickActionLinkProps) {
  return (
    <Link href={href} className="island p-4 card-hover group flex items-center gap-3">
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
