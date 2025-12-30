'use client';

import {
  FileText,
  GitBranch,
  CheckCircle2,
  Upload,
  Activity,
  Plus,
  Trash2,
  GitMerge,
  Settings,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';
import { useUserActivities, type Activity as ActivityType } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@localeflow/sdk-nextjs';

interface ActivityFeedProps {
  hasProjects: boolean;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'translation':
      return FileText;
    case 'key_add':
      return Plus;
    case 'key_delete':
      return Trash2;
    case 'branch_create':
      return GitBranch;
    case 'branch_delete':
      return Trash2;
    case 'merge':
      return GitMerge;
    case 'import':
      return Upload;
    case 'export':
      return Download;
    case 'project_settings':
      return Settings;
    case 'environment_create':
    case 'environment_delete':
    case 'environment_switch_branch':
      return Layers;
    case 'ai_translate':
      return Sparkles;
    default:
      return Activity;
  }
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};

const getActivityDescription = (activity: ActivityType): string => {
  const { type, count, metadata } = activity;
  const languages = metadata?.languages?.join(', ') || '';

  switch (type) {
    case 'translation':
      return count === 1
        ? `Updated translation${languages ? ` in ${languages.toUpperCase()}` : ''}`
        : `Updated ${count} translations${languages ? ` in ${languages.toUpperCase()}` : ''}`;
    case 'key_add':
      return count === 1 ? 'Added translation key' : `Added ${count} translation keys`;
    case 'key_delete':
      return count === 1 ? 'Deleted translation key' : `Deleted ${count} translation keys`;
    case 'branch_create':
      return `Created branch "${metadata?.branchName || 'new branch'}"`;
    case 'branch_delete':
      return `Deleted branch "${metadata?.branchName || ''}"`;
    case 'merge':
      return `Merged "${metadata?.sourceBranchName}" into "${metadata?.targetBranchName}"`;
    case 'import':
      return `Imported ${metadata?.keyCount || count} keys${metadata?.fileName ? ` from ${metadata.fileName}` : ''}`;
    case 'export':
      return `Exported translations${metadata?.fileName ? ` to ${metadata.fileName}` : ''}`;
    case 'project_settings':
      return 'Updated project settings';
    case 'environment_create':
      return `Created environment "${metadata?.environmentName}"`;
    case 'environment_delete':
      return `Deleted environment "${metadata?.environmentName}"`;
    case 'environment_switch_branch':
      return `Switched environment to branch "${metadata?.newBranchName}"`;
    case 'ai_translate':
      return `AI translated ${count} keys`;
    default:
      return 'Activity recorded';
  }
};

export function ActivityFeed({ hasProjects }: ActivityFeedProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useUserActivities(10);
  const activities = data?.activities || [];

  return (
    <div className="space-y-3 animate-fade-in-up stagger-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('activity.title')}
        </h2>
        <span className="text-xs text-muted-foreground">{t('activity.lastDay')}</span>
      </div>
      <div className="island divide-y divide-border">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasProjects || activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('activity.empty')}
            </p>
          </div>
        ) : (
          activities.map((item) => {
            const Icon = getActivityIcon(item.type);
            return (
              <div key={item.id} className="p-4 flex items-start gap-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{getActivityDescription(item)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.projectName} · {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
