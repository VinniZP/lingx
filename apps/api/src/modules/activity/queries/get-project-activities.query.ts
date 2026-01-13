import type { Activity } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Result type for project activities query.
 */
export interface ProjectActivitiesResult {
  activities: Activity[];
  nextCursor?: string;
}

/**
 * Query to get recent activities for a specific project.
 * Used by the project details page activity feed.
 *
 * Authorization: Requires membership in the project.
 * Returns 404 for both non-existent projects and unauthorized access
 * to prevent information disclosure.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class GetProjectActivitiesQuery implements IQuery<ProjectActivitiesResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ProjectActivitiesResult;

  constructor(
    /** Project ID to fetch activities for */
    public readonly projectId: string,
    /** User ID for authorization check */
    public readonly userId: string,
    /** Pagination options */
    public readonly options?: { limit?: number; cursor?: string }
  ) {}
}
