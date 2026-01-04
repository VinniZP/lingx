/**
 * Activity Item Component
 *
 * Single activity row with hover preview and click-to-view functionality.
 * Used in both dashboard and project activity feeds.
 */
'use client';

import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { Activity } from '@lingx/shared';
import { Eye } from 'lucide-react';
import { useState } from 'react';
import { ActivityChangesModal } from './activity-changes-modal';
import { formatRelativeTime, getActivityDescription, translateKey } from './activity-description';
import { ActivityIcon } from './activity-icon';
import { ActivityPreview } from './activity-preview';

interface ActivityItemProps {
  activity: Activity;
  /** Show project name in subtitle (for user-wide feeds) */
  showProjectName?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Activity item with hover preview and modal access.
 *
 * Features:
 * - Icon based on activity type
 * - Human-readable description
 * - Relative time display
 * - Hover preview (first 10 changes)
 * - Click "View all" for full audit modal
 */
export function ActivityItem({ activity, showProjectName = false, className }: ActivityItemProps) {
  const { t, td } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const hasPreview =
    (activity.metadata?.preview && activity.metadata.preview.length > 0) ||
    activity.metadata?.hasMore ||
    activity.count > 1;

  return (
    <>
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div
            className={cn(
              'hover:bg-accent/30 flex cursor-default items-start gap-3 p-4 transition-colors',
              className
            )}
          >
            <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
              <ActivityIcon type={activity.type} className="text-muted-foreground size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm">{translateKey(td, getActivityDescription(activity))}</p>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                {showProjectName && activity.projectName && (
                  <>
                    <span>{activity.projectName}</span>
                    <span>·</span>
                  </>
                )}
                <span>{activity.userName}</span>
                <span>·</span>
                <span>{translateKey(td, formatRelativeTime(activity.createdAt))}</span>
              </div>
            </div>

            {hasPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground/40 hover:text-foreground size-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalOpen(true);
                }}
                aria-label={t('activity.viewAll')}
              >
                <Eye className="size-4" />
              </Button>
            )}
          </div>
        </HoverCardTrigger>

        <HoverCardContent
          side="left"
          align="start"
          className="w-72 overflow-hidden p-0"
          sideOffset={8}
        >
          {/* Header */}
          <div className="border-border/50 bg-muted/20 border-b px-3 py-2.5">
            <p className="text-sm leading-tight font-medium">
              {translateKey(td, getActivityDescription(activity))}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {activity.userName} · {translateKey(td, formatRelativeTime(activity.createdAt))}
            </p>
          </div>

          {/* Preview content */}
          <div className="p-3">
            <ActivityPreview activity={activity} />
          </div>

          {/* Footer action */}
          {hasPreview && (
            <div className="border-border/50 bg-muted/10 border-t px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 w-full text-xs"
                onClick={() => setModalOpen(true)}
              >
                {t('activity.viewAllChanges', { count: activity.count })}
              </Button>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>

      <ActivityChangesModal activity={activity} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
