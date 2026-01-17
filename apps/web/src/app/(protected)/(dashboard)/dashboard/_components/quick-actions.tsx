'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { GitBranch, Key, Terminal, Upload, Users } from 'lucide-react';
import Link from 'next/link';

interface QuickActionsProps {
  isManager: boolean;
}

export function QuickActions({ isManager }: QuickActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 lg:col-span-3">
      <div className="animate-fade-in-up stagger-3 space-y-3">
        <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wider uppercase">
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
      <div className="island bg-primary/5 border-primary/10 animate-fade-in-up stagger-4 border p-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Terminal className="text-primary size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('dashboard.cli.title')}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{t('dashboard.cli.description')}</p>
            <code className="text-primary/70 mt-2 block font-mono text-[10px]">
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
    <Link href={href} className="island card-hover group flex items-center gap-3 p-4">
      <div className="bg-muted group-hover:bg-primary/10 flex size-9 items-center justify-center rounded-lg transition-colors">
        <Icon className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </Link>
  );
}
