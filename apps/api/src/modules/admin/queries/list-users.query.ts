import type { IQuery } from '../../../shared/cqrs/index.js';
import type { PaginatedUsers, Pagination, UserFilters } from '../repositories/admin.repository.js';

/**
 * Query to list all users with filters and pagination.
 * Requires ADMIN role.
 */
export class ListUsersQuery implements IQuery<PaginatedUsers> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: PaginatedUsers;

  constructor(
    /** Filters to apply (role, status, search) */
    public readonly filters: UserFilters,
    /** Pagination options */
    public readonly pagination: Pagination,
    /** User ID making the request (for admin verification) */
    public readonly actorId: string
  ) {}
}
