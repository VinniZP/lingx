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
import { useTranslation } from '@localeflow/sdk-nextjs';

interface ActivityPreviewProps {
  activity: Activity;
  className?: string;
}

/**
 * Preview content for activity HoverCard with GitHub-style diffs.
 */
export function ActivityPreview({ activity, className }: ActivityPreviewProps) {
  const { t } = useTranslation();
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
        <span>{t('activity.preview.loading')}</span>
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
          {t('activity.preview.andMore', { count: remainingChanges })}
        </div>
      )}
    </div>
  );
}

/**
 * Mini GitHub-style diff item for preview.
 */
function PreviewDiffItem({ item }: { item: ActivityPreviewItem }) {
  const { t } = useTranslation();
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
            <span className="truncate">{truncate(item.oldValue) || t('activity.preview.empty')}</span>
          </div>
        )}
        {/* New value */}
        {(item.newValue || !isDeletion) && (
          <div className="flex gap-1.5 px-2 py-0.5 bg-success/8 text-foreground/80">
            <span className="text-success/70 select-none">+</span>
            <span className="truncate">{truncate(item.newValue) || t('activity.preview.empty')}</span>
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
  const { t } = useTranslation();
  const { type, metadata, count } = activity;

  const items: Array<{ label: string; value: string }> = [];

  switch (type) {
    case 'branch_create':
      if (metadata?.branchName) items.push({ label: t('activity.preview.metadata.branch'), value: metadata.branchName });
      if (metadata?.sourceBranchName)
        items.push({ label: t('activity.preview.metadata.from'), value: metadata.sourceBranchName });
      break;

    case 'branch_delete':
      if (metadata?.branchName) items.push({ label: t('activity.preview.metadata.branch'), value: metadata.branchName });
      break;

    case 'merge':
      if (metadata?.sourceBranchName)
        items.push({ label: t('activity.preview.metadata.source'), value: metadata.sourceBranchName });
      if (metadata?.targetBranchName)
        items.push({ label: t('activity.preview.metadata.target'), value: metadata.targetBranchName });
      if (metadata?.conflictsResolved !== undefined)
        items.push({ label: t('activity.preview.metadata.conflictsResolved'), value: String(metadata.conflictsResolved) });
      break;

    case 'import':
      if (metadata?.fileName) items.push({ label: t('activity.preview.metadata.file'), value: metadata.fileName });
      if (metadata?.keyCount) items.push({ label: t('activity.preview.metadata.keys'), value: String(metadata.keyCount) });
      if (metadata?.languages?.length)
        items.push({ label: t('activity.preview.metadata.languages'), value: metadata.languages.join(', ').toUpperCase() });
      break;

    case 'export':
      if (metadata?.format) items.push({ label: t('activity.preview.metadata.format'), value: metadata.format });
      if (metadata?.keyCount) items.push({ label: t('activity.preview.metadata.keys'), value: String(metadata.keyCount) });
      break;

    case 'project_settings':
      if (metadata?.changedFields?.length)
        items.push({ label: t('activity.preview.metadata.changed'), value: metadata.changedFields.join(', ') });
      break;

    case 'environment_create':
    case 'environment_delete':
      if (metadata?.environmentName)
        items.push({ label: t('activity.preview.metadata.environment'), value: metadata.environmentName });
      break;

    case 'environment_switch_branch':
      if (metadata?.environmentName)
        items.push({ label: t('activity.preview.metadata.environment'), value: metadata.environmentName });
      if (metadata?.oldBranchName) items.push({ label: t('activity.preview.metadata.from'), value: metadata.oldBranchName });
      if (metadata?.newBranchName) items.push({ label: t('activity.preview.metadata.to'), value: metadata.newBranchName });
      break;

    case 'ai_translate':
      if (metadata?.keyCount) items.push({ label: t('activity.preview.metadata.keys'), value: String(metadata.keyCount) });
      if (metadata?.languages?.length)
        items.push({ label: t('activity.preview.metadata.languages'), value: metadata.languages.join(', ').toUpperCase() });
      break;
  }

  // If no metadata items but we have changes, show count hint
  if (items.length === 0 && count > 0) {
    return (
      <div className="text-xs text-muted-foreground">
        <p className="italic mb-2">{t('activity.preview.viewAllHint', { count })}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">{t('activity.preview.noDetails')}</div>
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
