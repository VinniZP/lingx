/**
 * Dashboard Module
 *
 * CQRS-lite module for dashboard statistics.
 * Provides queries for aggregate user dashboard data.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import { defineQueryHandler, registerQueryHandlers } from '../../shared/cqrs/index.js';

// Repository
import { DashboardRepository } from './dashboard.repository.js';

// Query handlers
import { GetDashboardStatsHandler } from './queries/get-dashboard-stats.handler.js';

// Queries
import { GetDashboardStatsQuery } from './queries/get-dashboard-stats.query.js';

// Re-export queries for external use
export { GetDashboardStatsQuery } from './queries/get-dashboard-stats.query.js';

// Re-export repository type
export type { DashboardRepository } from './dashboard.repository.js';

// Type-safe handler registrations
const queryRegistrations = [
  defineQueryHandler(GetDashboardStatsQuery, GetDashboardStatsHandler, 'getDashboardStatsHandler'),
];

/**
 * Register dashboard module handlers with the container.
 */
export function registerDashboardModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    dashboardRepository: asClass(DashboardRepository).singleton(),
  });

  // Register query handlers
  container.register({
    getDashboardStatsHandler: asClass(GetDashboardStatsHandler).singleton(),
  });

  // Register with query bus
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);
}
