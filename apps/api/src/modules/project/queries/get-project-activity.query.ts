import type { ActivityListResponse } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to get project activity feed.
 */
export class GetProjectActivityQuery implements IQuery<ActivityListResponse> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ActivityListResponse;

  constructor(
    /** Project ID or slug */
    public readonly projectIdOrSlug: string,
    /** User ID requesting access */
    public readonly userId: string,
    /** Maximum number of activities to return */
    public readonly limit?: number,
    /** Pagination cursor */
    public readonly cursor?: string
  ) {}
}
