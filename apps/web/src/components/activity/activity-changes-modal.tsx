/**
 * Activity Changes Drawer
 *
 * Premium audit trail drawer showing all changes for an activity.
 * Editorial design with refined typography and staggered animations.
 */
'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Loader2, FileText, Clock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { activityApi, type Activity, type ActivityChange } from '@/lib/api';
import { getActivityDescription, formatRelativeTime } from './activity-description';
import { getActivityIcon } from './activity-icon';
import { cn } from '@/lib/utils';

interface ActivityChangesModalProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEMS_PER_PAGE = 20;

/**
 * Premium drawer showing full audit trail for an activity.
 */
export function ActivityChangesModal({
  activity,
  open,
  onOpenChange,
}: ActivityChangesModalProps) {
  const [changes, setChanges] = useState<ActivityChange[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch initial data when drawer opens
  useEffect(() => {
    if (open && activity?.id && !initialLoaded) {
      setLoading(true);
      activityApi
        .getActivityChanges(activity.id, { limit: ITEMS_PER_PAGE })
        .then((result) => {
          setChanges(result.changes);
          setTotal(result.total);
          setCursor(result.nextCursor);
          setHasMore(!!result.nextCursor);
          setInitialLoaded(true);
        })
        .finally(() => setLoading(false));
    }
  }, [open, activity?.id, initialLoaded]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setChanges([]);
      setCursor(undefined);
      setTotal(0);
      setHasMore(false);
      setInitialLoaded(false);
    }
  }, [open]);

  // Load more handler
  const loadMore = async () => {
    if (!activity?.id || !cursor || loading) return;

    setLoading(true);
    try {
      const result = await activityApi.getActivityChanges(activity.id, {
        limit: ITEMS_PER_PAGE,
        cursor,
      });
      setChanges((prev) => [...prev, ...result.changes]);
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } finally {
      setLoading(false);
    }
  };

  if (!activity) return null;

  const Icon = getActivityIcon(activity.type);
  const isInitialLoading = loading && !initialLoaded;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[580px] flex flex-col p-0 h-full gap-0">
        {/* Premium Header */}
        <SheetHeader className="p-6 pb-5 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
          <SheetTitle className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
              <Icon className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left space-y-1">
              <div className="font-semibold text-lg leading-tight">
                {getActivityDescription(activity)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                <span className="font-medium text-foreground/80">{activity.userName}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatRelativeTime(activity.createdAt)}
                </span>
                {activity.projectName && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{activity.projectName}</span>
                  </>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {isInitialLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="island p-4 space-y-3 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : changes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="size-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                No detailed changes recorded
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                This activity doesn't have granular change tracking.
              </p>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Audit Trail
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs font-mono tabular-nums">
                  {changes.length} / {total}
                </Badge>
              </div>

              {/* Changes List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-3">
                  {changes.map((change, index) => (
                    <ChangeRow
                      key={change.id}
                      change={change}
                      index={index}
                    />
                  ))}

                  {hasMore && (
                    <div className="pt-4 pb-6">
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full h-11 rounded-xl gap-2 border-dashed hover:border-solid hover:bg-muted/50 transition-all"
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        <span>Load {Math.min(ITEMS_PER_PAGE, total - changes.length)} more</span>
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                          {total - changes.length}
                        </Badge>
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * GitHub-style diff row with old/new values.
 */
function ChangeRow({ change, index }: { change: ActivityChange; index: number }) {
  const isAddition = !change.oldValue && change.newValue;
  const isDeletion = change.oldValue && !change.newValue;

  return (
    <div
      className="rounded-lg border border-border/50 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 20, 150)}ms` }}
    >
      {/* Header with key + language */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/50">
        <code className="font-mono text-xs text-foreground/70 truncate flex-1">
          {change.keyName || change.entityId}
        </code>
        {change.language && (
          <Badge
            variant="secondary"
            className="text-[10px] font-mono uppercase px-1.5 py-0 h-4 shrink-0"
          >
            {change.language}
          </Badge>
        )}
      </div>

      {/* Diff lines */}
      <div className="text-sm font-mono">
        {/* Old value (red) */}
        {(change.oldValue || !isAddition) && (
          <div className="flex gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/10">
            <span className="text-destructive shrink-0 select-none">−</span>
            <span className={cn(
              'break-words min-w-0',
              change.oldValue ? 'text-foreground/70' : 'text-muted-foreground/50 italic'
            )}>
              {change.oldValue || 'empty'}
            </span>
          </div>
        )}

        {/* New value (green) */}
        {(change.newValue || !isDeletion) && (
          <div className="flex gap-2 px-3 py-1.5 bg-success/10">
            <span className="text-success shrink-0 select-none">+</span>
            <span className={cn(
              'break-words min-w-0',
              change.newValue ? 'text-foreground' : 'text-muted-foreground/50 italic'
            )}>
              {change.newValue || 'empty'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
