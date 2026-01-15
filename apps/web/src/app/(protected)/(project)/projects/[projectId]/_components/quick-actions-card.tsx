'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Edit, Key, Settings, Zap } from 'lucide-react';
import { QuickActionCard } from './quick-action-card';

interface QuickActionsCardProps {
  projectId: string;
  defaultBranchId?: string;
}

/**
 * QuickActionsCard - Sidebar section with quick action links
 */
export function QuickActionsCard({ projectId, defaultBranchId }: QuickActionsCardProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in-up stagger-3 space-y-3">
      <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wider uppercase">
        {t('projectDetail.quickActions.title')}
      </h2>
      <div className="space-y-3">
        {defaultBranchId && (
          <QuickActionCard
            href={`/workbench/${projectId}/${defaultBranchId}`}
            icon={Edit}
            title={t('projectDetail.quickActions.editTranslations')}
            subtitle={t('projectDetail.quickActions.editTranslationsSubtitle')}
          />
        )}
        <QuickActionCard
          href={`/projects/${projectId}/environments`}
          icon={Zap}
          title={t('projectDetail.quickActions.environments')}
          subtitle={t('projectDetail.quickActions.environmentsSubtitle')}
        />
        <QuickActionCard
          href="/settings/api-keys"
          icon={Key}
          title={t('projectDetail.quickActions.apiKeys')}
          subtitle={t('projectDetail.quickActions.apiKeysSubtitle')}
        />
        <QuickActionCard
          href={`/projects/${projectId}/settings`}
          icon={Settings}
          title={t('projectDetail.quickActions.projectSettings')}
          subtitle={t('projectDetail.quickActions.projectSettingsSubtitle')}
        />
      </div>
    </div>
  );
}
