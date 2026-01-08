import type { ActivityChange } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Result type for activity changes query.
 */
export interface ActivityChangesResult {
  changes: ActivityChange[];
  nextCursor?: string;
  total: number;
}

/**
 * Query to get full audit trail for a specific activity.
 * Used for the "View all changes" modal.
 *
 * Authorization: Requires membership in the activity's project.
 * Returns 404 for both non-existent activities and unauthorized access
 * to prevent information disclosure.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class GetActivityChangesQuery implements IQuery<ActivityChangesResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ActivityChangesResult;

  constructor(
    /** Activity ID to fetch changes for */
    public readonly activityId: string,
    /** User ID for authorization check */
    public readonly userId: string,
    /** Pagination options */
    public readonly options?: { limit?: number; cursor?: string }
  ) {}
}
