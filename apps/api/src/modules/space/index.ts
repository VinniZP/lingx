/**
 * Space Module
 *
 * CQRS-lite module for space operations.
 * Provides commands for create/update/delete and queries for retrieval.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import {
  defineCommandHandler,
  defineEventHandler,
  defineQueryHandler,
  registerCommandHandlers,
  registerEventHandlers,
  registerQueryHandlers,
} from '../../shared/cqrs/index.js';

// Repository
import { SpaceRepository } from './space.repository.js';

// Command handlers
import { CreateSpaceHandler } from './commands/create-space.handler.js';
import { DeleteSpaceHandler } from './commands/delete-space.handler.js';
import { UpdateSpaceHandler } from './commands/update-space.handler.js';

// Query handlers
import { GetSpaceStatsHandler } from './queries/get-space-stats.handler.js';
import { GetSpaceHandler } from './queries/get-space.handler.js';
import { ListSpacesHandler } from './queries/list-spaces.handler.js';

// Commands
import { CreateSpaceCommand } from './commands/create-space.command.js';
import { DeleteSpaceCommand } from './commands/delete-space.command.js';
import { UpdateSpaceCommand } from './commands/update-space.command.js';

// Queries
import { GetSpaceStatsQuery } from './queries/get-space-stats.query.js';
import { GetSpaceQuery } from './queries/get-space.query.js';
import { ListSpacesQuery } from './queries/list-spaces.query.js';

// Events
import { SpaceCreatedEvent } from './events/space-created.event.js';
import { SpaceDeletedEvent } from './events/space-deleted.event.js';
import { SpaceUpdatedEvent } from './events/space-updated.event.js';

// Event handlers
import { SpaceActivityHandler } from './handlers/space-activity.handler.js';

// Re-export commands for external use
export { CreateSpaceCommand } from './commands/create-space.command.js';
export { DeleteSpaceCommand } from './commands/delete-space.command.js';
export { UpdateSpaceCommand, type UpdateSpaceInput } from './commands/update-space.command.js';

// Re-export queries
export { GetSpaceStatsQuery } from './queries/get-space-stats.query.js';
export { GetSpaceQuery } from './queries/get-space.query.js';
export { ListSpacesQuery } from './queries/list-spaces.query.js';

// Re-export events
export { SpaceCreatedEvent } from './events/space-created.event.js';
export { SpaceDeletedEvent } from './events/space-deleted.event.js';
export { SpaceUpdatedEvent } from './events/space-updated.event.js';

// Re-export types
export type {
  BranchSummary,
  CreateSpaceInput,
  NonEmptyArray,
  SpaceStats,
  SpaceWithBranches,
} from './space.repository.js';

// Type-safe handler registrations
const commandRegistrations = [
  defineCommandHandler(CreateSpaceCommand, CreateSpaceHandler, 'createSpaceHandler'),
  defineCommandHandler(UpdateSpaceCommand, UpdateSpaceHandler, 'updateSpaceHandler'),
  defineCommandHandler(DeleteSpaceCommand, DeleteSpaceHandler, 'deleteSpaceHandler'),
];

const queryRegistrations = [
  defineQueryHandler(ListSpacesQuery, ListSpacesHandler, 'listSpacesHandler'),
  defineQueryHandler(GetSpaceQuery, GetSpaceHandler, 'getSpaceHandler'),
  defineQueryHandler(GetSpaceStatsQuery, GetSpaceStatsHandler, 'getSpaceStatsHandler'),
];

const eventRegistrations = [
  defineEventHandler(SpaceCreatedEvent, SpaceActivityHandler, 'spaceActivityHandler'),
  defineEventHandler(SpaceUpdatedEvent, SpaceActivityHandler, 'spaceActivityHandler'),
  defineEventHandler(SpaceDeletedEvent, SpaceActivityHandler, 'spaceActivityHandler'),
];

/**
 * Register space module handlers with the container.
 */
export function registerSpaceModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    spaceRepository: asClass(SpaceRepository).singleton(),
  });

  // Register command handlers
  container.register({
    createSpaceHandler: asClass(CreateSpaceHandler).singleton(),
    updateSpaceHandler: asClass(UpdateSpaceHandler).singleton(),
    deleteSpaceHandler: asClass(DeleteSpaceHandler).singleton(),
  });

  // Register query handlers
  container.register({
    listSpacesHandler: asClass(ListSpacesHandler).singleton(),
    getSpaceHandler: asClass(GetSpaceHandler).singleton(),
    getSpaceStatsHandler: asClass(GetSpaceStatsHandler).singleton(),
  });

  // Register event handler (single instance handles all space events)
  container.register({
    spaceActivityHandler: asClass(SpaceActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
