/**
 * GetDashboardStatsHandler
 *
 * Handler for GetDashboardStatsQuery.
 * Retrieves aggregate dashboard statistics for a user.
 */
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { DashboardRepository } from '../dashboard.repository.js';
import type { GetDashboardStatsQuery } from './get-dashboard-stats.query.js';

/**
 * Handler for GetDashboardStatsQuery.
 * Delegates to repository to compute aggregate stats.
 */
export class GetDashboardStatsHandler implements IQueryHandler<GetDashboardStatsQuery> {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async execute(query: GetDashboardStatsQuery): Promise<InferQueryResult<GetDashboardStatsQuery>> {
    return this.dashboardRepository.getStatsForUser(query.userId);
  }
}
