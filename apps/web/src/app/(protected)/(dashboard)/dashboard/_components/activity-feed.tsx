'use client';

import { ActivityItem } from '@/components/activity';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserActivities } from '@/hooks';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Activity } from 'lucide-react';

interface ActivityFeedProps {
  hasProjects: boolean;
}

/**
 * Dashboard activity feed component.
 *
 * Shows recent activities across all user's projects with:
 * - Hover preview (first 10 changes)
 * - Click to view full audit trail
 * - Project name shown for each activity
 */
export function ActivityFeed({ hasProjects }: ActivityFeedProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useUserActivities(10);
  const activities = data?.activities || [];

  return (
    <div className="animate-fade-in-up stagger-4 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t('activity.title')}
        </h2>
        <span className="text-muted-foreground text-xs">{t('activity.lastDay')}</span>
      </div>
      <div className="island divide-border divide-y">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasProjects || activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="bg-muted mx-auto mb-3 flex size-10 items-center justify-center rounded-full">
              <Activity className="text-muted-foreground size-5" />
            </div>
            <p className="text-muted-foreground text-sm">{t('activity.empty')}</p>
          </div>
        ) : (
          activities.map((item) => <ActivityItem key={item.id} activity={item} showProjectName />)
        )}
      </div>
    </div>
  );
}
