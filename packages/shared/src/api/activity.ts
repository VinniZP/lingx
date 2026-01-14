/**
 * Activity API Contracts
 *
 * Shared types for activity tracking between frontend and backend.
 * Per ADR-0005: Activity Tracking System
 */

// Re-export Zod-inferred types as the single source of truth
export type {
  Activity,
  ActivityChange,
  ActivityChangesResponse,
  ActivityListResponse,
  ActivityMetadata,
} from '../validation/response.schema.js';

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
  | 'project_create'
  | 'project_settings'
  | 'project_delete'
  | 'space_create'
  | 'space_update'
  | 'space_delete'
  | 'branch_create'
  | 'branch_delete'
  | 'merge'
  | 'import'
  | 'export'
  | 'environment_create'
  | 'environment_update'
  | 'environment_delete'
  | 'environment_switch_branch'
  | 'ai_translate'
  | 'translation_approve'
  | 'translation_reject'
  // Member management (non-groupable)
  | 'member_role_change'
  | 'member_remove'
  | 'member_leave'
  | 'ownership_transfer'
  | 'member_invite'
  | 'invitation_accept';

/**
 * Activity types that can be grouped when consecutive
 */
export const GROUPABLE_ACTIVITY_TYPES = [
  'translation',
  'key_add',
  'key_delete',
] as const satisfies readonly ActivityType[];

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
 * Response from GET /api/activity (user's activities across projects)
 */
export interface UserActivityResponse {
  activities: import('../validation/response.schema.js').Activity[];
  nextCursor?: string;
}

/**
 * Response from GET /api/projects/:id/activity
 */
export interface ProjectActivityResponse {
  activities: import('../validation/response.schema.js').Activity[];
  nextCursor?: string;
}

/**
 * Input for logging a new activity (internal use)
 */
export interface CreateActivityInput {
  type: ActivityType;
  projectId: string;
  branchId?: string;
  userId: string;
  metadata?: Partial<import('../validation/response.schema.js').ActivityMetadata>;
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
