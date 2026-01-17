import type { IQuery } from '../../../shared/cqrs/index.js';
import type { UserActivity } from '../repositories/admin.repository.js';

/**
 * Query to get user's recent activity.
 * Requires ADMIN role.
 */
export class GetUserActivityQuery implements IQuery<UserActivity[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: UserActivity[];

  constructor(
    /** User ID to get activity for */
    public readonly userId: string,
    /** Maximum number of activity entries to return (default: 50) */
    public readonly limit: number = 50,
    /** User ID making the request (for admin verification) */
    public readonly actorId: string
  ) {}
}
