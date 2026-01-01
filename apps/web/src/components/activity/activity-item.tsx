/**
 * Activity Item Component
 *
 * Single activity row with hover preview and click-to-view functionality.
 * Used in both dashboard and project activity feeds.
 */
'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import type { Activity } from '@localeflow/shared';
import { getActivityIcon } from './activity-icon';
import { getActivityDescription, formatRelativeTime, translateKey } from './activity-description';
import { ActivityPreview } from './activity-preview';
import { ActivityChangesModal } from './activity-changes-modal';
import { cn } from '@/lib/utils';
import { useTranslation } from '@localeflow/sdk-nextjs';

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
export function ActivityItem({
  activity,
  showProjectName = false,
  className,
}: ActivityItemProps) {
  const { t, td } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const Icon = getActivityIcon(activity.type);

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
              'p-4 flex items-start gap-3 cursor-default transition-colors hover:bg-accent/30',
              className
            )}
          >
            <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="size-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm">{translateKey(td, getActivityDescription(activity))}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
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
                className="size-7 shrink-0 text-muted-foreground/40 hover:text-foreground"
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
          className="w-72 p-0 overflow-hidden"
          sideOffset={8}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border/50 bg-muted/20">
            <p className="text-sm font-medium leading-tight">
              {translateKey(td, getActivityDescription(activity))}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {activity.userName} · {translateKey(td, formatRelativeTime(activity.createdAt))}
            </p>
          </div>

          {/* Preview content */}
          <div className="p-3">
            <ActivityPreview activity={activity} />
          </div>

          {/* Footer action */}
          {hasPreview && (
            <div className="px-3 py-2 border-t border-border/50 bg-muted/10">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setModalOpen(true)}
              >
                {t('activity.viewAllChanges', { count: activity.count })}
              </Button>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>

      <ActivityChangesModal
        activity={activity}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}

/**
 * Simplified activity item for compact displays.
 * No hover preview, just basic info.
 */
export function ActivityItemCompact({
  activity,
  className,
}: {
  activity: Activity;
  className?: string;
}) {
  const { td } = useTranslation();
  const Icon = getActivityIcon(activity.type);

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="truncate">{translateKey(td, getActivityDescription(activity))}</span>
      <span className="text-muted-foreground text-xs shrink-0">
        {translateKey(td, formatRelativeTime(activity.createdAt))}
      </span>
    </div>
  );
}
