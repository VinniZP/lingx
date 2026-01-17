/**
 * Activity Module
 *
 * CQRS-lite module for activity operations.
 * Provides queries for retrieving activities and activity changes.
 * Activity logging is handled by ActivityService via BullMQ queue.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import { defineQueryHandler, registerQueryHandlers } from '../../shared/cqrs/index.js';

// Repository
import { ActivityRepository } from './activity.repository.js';

// Query handlers
import { GetActivityChangesHandler } from './queries/get-activity-changes.handler.js';
import { GetProjectActivitiesHandler } from './queries/get-project-activities.handler.js';
import { GetUserActivitiesHandler } from './queries/get-user-activities.handler.js';

// Queries
import { GetActivityChangesQuery } from './queries/get-activity-changes.query.js';
import { GetProjectActivitiesQuery } from './queries/get-project-activities.query.js';
import { GetUserActivitiesQuery } from './queries/get-user-activities.query.js';

// Re-export repository
export { ActivityRepository } from './activity.repository.js';

// Re-export utilities
export { buildPreview, generateGroupKey, MAX_PREVIEW_ITEMS } from './activity.utils.js';

// Re-export queries for external use
export { GetActivityChangesQuery } from './queries/get-activity-changes.query.js';
export { GetProjectActivitiesQuery } from './queries/get-project-activities.query.js';
export { GetUserActivitiesQuery } from './queries/get-user-activities.query.js';

// Re-export result types
export type { ActivityChangesResult } from './queries/get-activity-changes.query.js';
export type { ProjectActivitiesResult } from './queries/get-project-activities.query.js';
export type { UserActivitiesResult } from './queries/get-user-activities.query.js';

// Type-safe handler registrations
const queryRegistrations = [
  defineQueryHandler(GetUserActivitiesQuery, GetUserActivitiesHandler, 'getUserActivitiesHandler'),
  defineQueryHandler(
    GetActivityChangesQuery,
    GetActivityChangesHandler,
    'getActivityChangesHandler'
  ),
  defineQueryHandler(
    GetProjectActivitiesQuery,
    GetProjectActivitiesHandler,
    'getProjectActivitiesHandler'
  ),
];

/**
 * Register activity module handlers with the container.
 */
export function registerActivityModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    activityRepository: asClass(ActivityRepository).singleton(),
  });

  // Register query handlers
  container.register({
    getUserActivitiesHandler: asClass(GetUserActivitiesHandler).singleton(),
    getActivityChangesHandler: asClass(GetActivityChangesHandler).singleton(),
    getProjectActivitiesHandler: asClass(GetProjectActivitiesHandler).singleton(),
  });

  // Register with query bus using type-safe registrations
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);
}
