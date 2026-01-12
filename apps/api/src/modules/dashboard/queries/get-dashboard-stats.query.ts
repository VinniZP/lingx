/**
 * GetDashboardStatsQuery
 *
 * Query to retrieve aggregate dashboard statistics for a user.
 */
import type { DashboardStats } from '@lingx/shared';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to get aggregate dashboard statistics for a user.
 * Returns stats across all projects the user is a member of.
 */
export class GetDashboardStatsQuery implements IQuery<DashboardStats> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: DashboardStats;

  constructor(
    /** User ID to get dashboard stats for */
    public readonly userId: string
  ) {}
}
