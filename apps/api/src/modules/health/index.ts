/**
 * Health Module
 *
 * Provides health check functionality via CQRS query.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import { GetHealthHandler } from './queries/get-health.handler.js';
import { GetHealthQuery } from './queries/get-health.query.js';

// Re-export query and types
export { GetHealthQuery } from './queries/get-health.query.js';
export type { HealthResult } from './queries/get-health.query.js';

/**
 * Register health module handlers with the container.
 */
export function registerHealthModule(container: AwilixContainer<Cradle>): void {
  // Register handler
  container.register({
    getHealthHandler: asClass(GetHealthHandler).singleton(),
  });

  // Register handler with query bus
  const queryBus = container.resolve('queryBus');
  queryBus.register(GetHealthQuery, 'getHealthHandler');
}
