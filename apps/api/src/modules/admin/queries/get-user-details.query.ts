import type { IQuery } from '../../../shared/cqrs/index.js';
import type { UserWithProjects } from '../repositories/admin.repository.js';

/** User details with stats for admin panel */
export interface UserDetailsResult extends UserWithProjects {
  stats: {
    projectCount: number;
    lastActiveAt: Date | null;
  };
}

/**
 * Query to get detailed user information.
 * Requires ADMIN role.
 */
export class GetUserDetailsQuery implements IQuery<UserDetailsResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: UserDetailsResult;

  constructor(
    /** User ID to get details for */
    public readonly userId: string,
    /** User ID making the request (for admin verification) */
    public readonly actorId: string
  ) {}
}
