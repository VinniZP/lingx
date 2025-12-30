/**
 * Activity Preview Component
 *
 * GitHub-style diff preview for activity HoverCard.
 * Shows first 5 changes with mini diff format.
 */
'use client';

import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useActivityChanges } from '@/hooks';
import type { Activity, ActivityPreviewItem, ActivityChange } from '@localeflow/shared';
import { cn } from '@/lib/utils';

interface ActivityPreviewProps {
  activity: Activity;
  className?: string;
}

/**
 * Preview content for activity HoverCard with GitHub-style diffs.
 */
export function ActivityPreview({ activity, className }: ActivityPreviewProps) {
  const { metadata, count } = activity;
  const preview = metadata?.preview || [];

  // If no preview in metadata but we have changes, fetch them
  const shouldFetch = preview.length === 0 && count > 0;
  const { data: changesData, isLoading } = useActivityChanges(
    shouldFetch ? activity.id : null,
    5
  );

  // Convert ActivityChange to preview format
  const fetchedPreview: ActivityPreviewItem[] = (changesData?.changes || []).map(
    (c: ActivityChange) => ({
      keyId: c.entityId,
      keyName: c.keyName || c.entityId,
      language: c.language,
      oldValue: c.oldValue?.substring(0, 60),
      newValue: c.newValue?.substring(0, 60),
    })
  );

  const displayPreview = preview.length > 0 ? preview.slice(0, 5) : fetchedPreview;
  const totalChanges = changesData?.total || count;
  const remainingChanges = totalChanges - displayPreview.length;

  // Show loading state when fetching
  if (shouldFetch && isLoading) {
    return (
      <div className={cn('flex items-center justify-center gap-2 text-xs text-muted-foreground py-6', className)}>
        <Loader2 className="size-3.5 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  // For activities without any preview or changes, show metadata details
  if (displayPreview.length === 0) {
    return (
      <div className={cn('', className)}>
        <ActivityMetadataPreview activity={activity} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Mini diff list */}
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {displayPreview.map((item, index) => (
          <PreviewDiffItem key={`${item.keyId}-${item.language || index}`} item={item} />
        ))}
      </div>

      {/* Remaining count */}
      {remainingChanges > 0 && (
        <div className="text-[11px] text-muted-foreground/70 text-center pt-1">
          +{remainingChanges} more
        </div>
      )}
    </div>
  );
}

/**
 * Mini GitHub-style diff item for preview.
 */
function PreviewDiffItem({ item }: { item: ActivityPreviewItem }) {
  const truncate = (value: string | undefined, maxLength: number = 35) => {
    if (!value) return null;
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
  };

  const isAddition = !item.oldValue && item.newValue;
  const isDeletion = item.oldValue && !item.newValue;

  return (
    <div className="rounded-md border border-border/50 overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/40 border-b border-border/50">
        <code className="font-mono text-[11px] text-foreground/70 truncate flex-1">
          {item.keyName}
        </code>
        {item.language && (
          <Badge
            variant="secondary"
            className="text-[9px] font-mono uppercase px-1 py-0 h-3.5 shrink-0"
          >
            {item.language}
          </Badge>
        )}
      </div>

      {/* Diff lines */}
      <div className="font-mono text-[11px]">
        {/* Old value */}
        {(item.oldValue || !isAddition) && (
          <div className="flex gap-1.5 px-2 py-0.5 bg-destructive/8 text-foreground/60">
            <span className="text-destructive/70 select-none">−</span>
            <span className="truncate">{truncate(item.oldValue) || 'empty'}</span>
          </div>
        )}
        {/* New value */}
        {(item.newValue || !isDeletion) && (
          <div className="flex gap-1.5 px-2 py-0.5 bg-success/8 text-foreground/80">
            <span className="text-success/70 select-none">+</span>
            <span className="truncate">{truncate(item.newValue) || 'empty'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Metadata preview for non-groupable activities.
 */
function ActivityMetadataPreview({ activity }: { activity: Activity }) {
  const { type, metadata, count } = activity;

  const items: Array<{ label: string; value: string }> = [];

  switch (type) {
    case 'branch_create':
      if (metadata?.branchName) items.push({ label: 'Branch', value: metadata.branchName });
      if (metadata?.sourceBranchName)
        items.push({ label: 'From', value: metadata.sourceBranchName });
      break;

    case 'branch_delete':
      if (metadata?.branchName) items.push({ label: 'Branch', value: metadata.branchName });
      break;

    case 'merge':
      if (metadata?.sourceBranchName)
        items.push({ label: 'Source', value: metadata.sourceBranchName });
      if (metadata?.targetBranchName)
        items.push({ label: 'Target', value: metadata.targetBranchName });
      if (metadata?.conflictsResolved !== undefined)
        items.push({ label: 'Conflicts resolved', value: String(metadata.conflictsResolved) });
      break;

    case 'import':
      if (metadata?.fileName) items.push({ label: 'File', value: metadata.fileName });
      if (metadata?.keyCount) items.push({ label: 'Keys', value: String(metadata.keyCount) });
      if (metadata?.languages?.length)
        items.push({ label: 'Languages', value: metadata.languages.join(', ').toUpperCase() });
      break;

    case 'export':
      if (metadata?.format) items.push({ label: 'Format', value: metadata.format });
      if (metadata?.keyCount) items.push({ label: 'Keys', value: String(metadata.keyCount) });
      break;

    case 'project_settings':
      if (metadata?.changedFields?.length)
        items.push({ label: 'Changed', value: metadata.changedFields.join(', ') });
      break;

    case 'environment_create':
    case 'environment_delete':
      if (metadata?.environmentName)
        items.push({ label: 'Environment', value: metadata.environmentName });
      break;

    case 'environment_switch_branch':
      if (metadata?.environmentName)
        items.push({ label: 'Environment', value: metadata.environmentName });
      if (metadata?.oldBranchName) items.push({ label: 'From', value: metadata.oldBranchName });
      if (metadata?.newBranchName) items.push({ label: 'To', value: metadata.newBranchName });
      break;

    case 'ai_translate':
      if (metadata?.keyCount) items.push({ label: 'Keys', value: String(metadata.keyCount) });
      if (metadata?.languages?.length)
        items.push({ label: 'Languages', value: metadata.languages.join(', ').toUpperCase() });
      break;
  }

  // If no metadata items but we have changes, show count hint
  if (items.length === 0 && count > 0) {
    return (
      <div className="text-xs text-muted-foreground">
        <p className="italic mb-2">Click "View all" to see {count} change{count !== 1 ? 's' : ''}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">No details available</div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}
