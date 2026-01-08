import type { Activity } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Result type for user activities query.
 */
export interface UserActivitiesResult {
  activities: Activity[];
  nextCursor?: string;
}

/**
 * Query to get recent activities for a user across all their projects.
 * Used by the dashboard activity feed.
 *
 * Authorization: Implicit - user can only see activities from projects they're a member of.
 * Result type is encoded in the interface for automatic type inference.
 */
export class GetUserActivitiesQuery implements IQuery<UserActivitiesResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: UserActivitiesResult;

  constructor(
    /** User ID to fetch activities for */
    public readonly userId: string,
    /** Pagination options */
    public readonly options?: { limit?: number; cursor?: string }
  ) {}
}
