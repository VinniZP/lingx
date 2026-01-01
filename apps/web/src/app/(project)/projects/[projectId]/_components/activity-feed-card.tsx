'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { ActivityItem } from '@/components/activity';
import type { Activity as ActivityType } from '@/lib/api';

interface ActivityFeedCardProps {
  activities: ActivityType[];
  isLoading: boolean;
}

/**
 * ActivityFeedCard - Displays recent project activity
 */
export function ActivityFeedCard({ activities, isLoading }: ActivityFeedCardProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 animate-fade-in-up stagger-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('activity.title')}
        </h2>
        <span className="text-xs text-muted-foreground">{t('activity.lastWeek')}</span>
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
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('activity.noRecent')}
            </p>
          </div>
        ) : (
          activities.map((item) => (
            <ActivityItem key={item.id} activity={item} />
          ))
        )}
      </div>
    </div>
  );
}
