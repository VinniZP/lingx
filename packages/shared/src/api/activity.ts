/**
 * Activity API Contracts
 *
 * Shared types for activity tracking between frontend and backend.
 * Per ADR-0005: Activity Tracking System
 */

/**
 * Activity types supported by the system
 * Matches the Prisma ActivityType enum
 */
export type ActivityType =
  // Groupable (sequential session-based)
  | 'translation'
  | 'key_add'
  | 'key_delete'
  // Non-groupable (single events)
  | 'branch_create'
  | 'branch_delete'
  | 'merge'
  | 'import'
  | 'export'
  | 'project_settings'
  | 'environment_create'
  | 'environment_delete'
  | 'environment_switch_branch'
  | 'ai_translate';

/**
 * Activity types that can be grouped when consecutive
 */
export const GROUPABLE_ACTIVITY_TYPES: ActivityType[] = [
  'translation',
  'key_add',
  'key_delete',
];

/**
 * Preview item for hover display (first 10 changes)
 */
export interface ActivityPreviewItem {
  keyId: string;
  keyName: string;
  language?: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * Metadata stored with each activity
 * Structure varies by activity type
 */
export interface ActivityMetadata {
  // Common for translation activities
  languages?: string[];

  // For branch operations
  branchName?: string;
  branchId?: string;
  sourceBranchName?: string;
  sourceBranchId?: string;
  targetBranchName?: string;
  targetBranchId?: string;

  // For import/export
  fileName?: string;
  format?: string;
  keyCount?: number;

  // For environment operations
  environmentName?: string;
  environmentId?: string;
  oldBranchName?: string;
  newBranchName?: string;

  // For project settings
  changedFields?: string[];

  // For merge
  conflictsResolved?: number;

  // Preview for hover (first 10 changes)
  preview?: ActivityPreviewItem[];

  // Overflow indicator
  hasMore?: boolean;
}

/**
 * Single activity item (grouped summary)
 */
export interface Activity {
  id: string;
  projectId: string;
  projectName?: string;
  branchId: string | null;
  branchName?: string;
  userId: string;
  userName: string;
  type: ActivityType;
  count: number;
  metadata: ActivityMetadata;
  createdAt: string;
}

/**
 * Individual change in the full audit trail
 */
export interface ActivityChange {
  id: string;
  activityId: string;
  entityType: string;
  entityId: string;
  keyName?: string;
  language?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

/**
 * Response from GET /api/activity (user's activities across projects)
 */
export interface UserActivityResponse {
  activities: Activity[];
  nextCursor?: string;
}

/**
 * Response from GET /api/projects/:id/activity
 */
export interface ProjectActivityResponse {
  activities: Activity[];
  nextCursor?: string;
}

/**
 * Response from GET /api/activity/:id/changes
 */
export interface ActivityChangesResponse {
  changes: ActivityChange[];
  nextCursor?: string;
  total: number;
}

/**
 * Input for logging a new activity (internal use)
 */
export interface CreateActivityInput {
  type: ActivityType;
  projectId: string;
  branchId?: string;
  userId: string;
  metadata?: Partial<ActivityMetadata>;
  changes: CreateActivityChangeInput[];
}

/**
 * Individual change detail for logging
 */
export interface CreateActivityChangeInput {
  entityType: string;
  entityId: string;
  keyName?: string;
  language?: string;
  oldValue?: string;
  newValue?: string;
}
