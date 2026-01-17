/**
 * Activity Utilities
 *
 * Shared utility functions for activity processing.
 * Used by the activity worker for grouping and preview generation.
 */
import type { ActivityMetadata } from '@lingx/shared';

/**
 * Maximum preview items to store in metadata.
 */
export const MAX_PREVIEW_ITEMS = 10;

/**
 * Generate a group key for activity grouping.
 * Uses 30-second time windows for groupable activity types.
 */
export function generateGroupKey(
  userId: string,
  projectId: string,
  type: string,
  branchId?: string,
  timestamp: Date = new Date()
): string {
  const windowSeconds = 30;
  const timeWindow = Math.floor(timestamp.getTime() / (windowSeconds * 1000));
  const branchPart = branchId || 'none';
  return `${userId}:${projectId}:${branchPart}:${type}:${timeWindow}`;
}

/**
 * Build preview items from changes (first 10 for hover display).
 */
export function buildPreview(
  changes: Array<{
    keyName?: string;
    language?: string;
    oldValue?: string;
    newValue?: string;
    entityId: string;
  }>
): { preview: ActivityMetadata['preview']; hasMore: boolean } {
  const preview = changes.slice(0, MAX_PREVIEW_ITEMS).map((c) => ({
    keyId: c.entityId,
    keyName: c.keyName || c.entityId,
    language: c.language,
    // Truncate values for preview
    oldValue: c.oldValue?.substring(0, 100),
    newValue: c.newValue?.substring(0, 100),
  }));

  return {
    preview,
    hasMore: changes.length > MAX_PREVIEW_ITEMS,
  };
}
