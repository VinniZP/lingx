/**
 * Activity Module
 *
 * CQRS-lite module for activity retrieval.
 * Provides queries for retrieving user activities and activity changes.
 * This module is read-only - activity logging is done via ActivityService.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import { defineQueryHandler, registerQueryHandlers } from '../../shared/cqrs/index.js';

// Query handlers
import { GetActivityChangesHandler } from './queries/get-activity-changes.handler.js';
import { GetUserActivitiesHandler } from './queries/get-user-activities.handler.js';

// Queries
import { GetActivityChangesQuery } from './queries/get-activity-changes.query.js';
import { GetUserActivitiesQuery } from './queries/get-user-activities.query.js';

// Re-export queries for external use
// Result types are encoded in the query interfaces via IQuery<TResult>
export { GetActivityChangesQuery } from './queries/get-activity-changes.query.js';
export { GetUserActivitiesQuery } from './queries/get-user-activities.query.js';

// Re-export result types
export type { ActivityChangesResult } from './queries/get-activity-changes.query.js';
export type { UserActivitiesResult } from './queries/get-user-activities.query.js';

// Type-safe handler registrations
// These verify at compile time that handlers match their queries
const queryRegistrations = [
  defineQueryHandler(GetUserActivitiesQuery, GetUserActivitiesHandler, 'getUserActivitiesHandler'),
  defineQueryHandler(
    GetActivityChangesQuery,
    GetActivityChangesHandler,
    'getActivityChangesHandler'
  ),
];

/**
 * Register activity module handlers with the container.
 */
export function registerActivityModule(container: AwilixContainer<Cradle>): void {
  // Register query handlers
  container.register({
    getUserActivitiesHandler: asClass(GetUserActivitiesHandler).singleton(),
    getActivityChangesHandler: asClass(GetActivityChangesHandler).singleton(),
  });

  // Register with query bus using type-safe registrations
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);
}
