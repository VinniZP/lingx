/**
 * Health Module
 *
 * Provides health check functionality via CQRS query.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import { defineQueryHandler, registerQueryHandlers } from '../../shared/cqrs/index.js';
import { GetHealthHandler } from './queries/get-health.handler.js';
import { GetHealthQuery } from './queries/get-health.query.js';

// Re-export query and types
export { GetHealthQuery } from './queries/get-health.query.js';
export type { HealthResult } from './queries/get-health.query.js';

// Type-safe handler registration
const queryRegistrations = [
  defineQueryHandler(GetHealthQuery, GetHealthHandler, 'getHealthHandler'),
];

/**
 * Register health module handlers with the container.
 */
export function registerHealthModule(container: AwilixContainer<Cradle>): void {
  // Register handler
  container.register({
    getHealthHandler: asClass(GetHealthHandler).singleton(),
  });

  // Register handler with query bus using type-safe registration
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);
}
