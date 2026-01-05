/**
 * Environment Module
 *
 * CQRS-lite module for environment management.
 * Provides commands for create/update/delete/switch-branch operations
 * and queries for retrieving environments.
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
import { EnvironmentRepository } from './environment.repository.js';

// Query handlers
import { GetEnvironmentHandler } from './queries/get-environment.handler.js';
import { ListEnvironmentsHandler } from './queries/list-environments.handler.js';

// Command handlers
import { CreateEnvironmentHandler } from './commands/create-environment.handler.js';
import { DeleteEnvironmentHandler } from './commands/delete-environment.handler.js';
import { SwitchBranchHandler } from './commands/switch-branch.handler.js';
import { UpdateEnvironmentHandler } from './commands/update-environment.handler.js';

// Queries
import { GetEnvironmentQuery } from './queries/get-environment.query.js';
import { ListEnvironmentsQuery } from './queries/list-environments.query.js';

// Commands
import { CreateEnvironmentCommand } from './commands/create-environment.command.js';
import { DeleteEnvironmentCommand } from './commands/delete-environment.command.js';
import { SwitchBranchCommand } from './commands/switch-branch.command.js';
import { UpdateEnvironmentCommand } from './commands/update-environment.command.js';

// Events
import { BranchSwitchedEvent } from './events/branch-switched.event.js';
import { EnvironmentCreatedEvent } from './events/environment-created.event.js';
import { EnvironmentDeletedEvent } from './events/environment-deleted.event.js';

// Event handlers
import {
  BranchSwitchedActivityHandler,
  EnvironmentCreatedActivityHandler,
  EnvironmentDeletedActivityHandler,
  EnvironmentUpdatedActivityHandler,
} from './handlers/environment-activity.handler.js';

import { EnvironmentUpdatedEvent } from './events/environment-updated.event.js';

// Re-export queries and commands for external use
// Result types are now encoded in the command/query interfaces via ICommand<TResult>/IQuery<TResult>
export { GetEnvironmentQuery } from './queries/get-environment.query.js';
export { ListEnvironmentsQuery } from './queries/list-environments.query.js';

export { CreateEnvironmentCommand } from './commands/create-environment.command.js';
export { DeleteEnvironmentCommand } from './commands/delete-environment.command.js';
export { SwitchBranchCommand } from './commands/switch-branch.command.js';
export { UpdateEnvironmentCommand } from './commands/update-environment.command.js';

// Re-export events
export { BranchSwitchedEvent } from './events/branch-switched.event.js';
export { EnvironmentCreatedEvent } from './events/environment-created.event.js';
export { EnvironmentDeletedEvent } from './events/environment-deleted.event.js';
export { EnvironmentUpdatedEvent } from './events/environment-updated.event.js';

// Re-export types from repository
export type { EnvironmentWithBranch } from './environment.repository.js';

// Type-safe handler registrations
// These verify at compile time that handlers match their commands/queries/events
const queryRegistrations = [
  defineQueryHandler(GetEnvironmentQuery, GetEnvironmentHandler, 'getEnvironmentHandler'),
  defineQueryHandler(ListEnvironmentsQuery, ListEnvironmentsHandler, 'listEnvironmentsHandler'),
];

const commandRegistrations = [
  defineCommandHandler(
    CreateEnvironmentCommand,
    CreateEnvironmentHandler,
    'createEnvironmentHandler'
  ),
  defineCommandHandler(
    UpdateEnvironmentCommand,
    UpdateEnvironmentHandler,
    'updateEnvironmentHandler'
  ),
  defineCommandHandler(SwitchBranchCommand, SwitchBranchHandler, 'switchBranchHandler'),
  defineCommandHandler(
    DeleteEnvironmentCommand,
    DeleteEnvironmentHandler,
    'deleteEnvironmentHandler'
  ),
];

const eventRegistrations = [
  defineEventHandler(
    EnvironmentCreatedEvent,
    EnvironmentCreatedActivityHandler,
    'environmentCreatedActivityHandler'
  ),
  defineEventHandler(
    EnvironmentUpdatedEvent,
    EnvironmentUpdatedActivityHandler,
    'environmentUpdatedActivityHandler'
  ),
  defineEventHandler(
    BranchSwitchedEvent,
    BranchSwitchedActivityHandler,
    'branchSwitchedActivityHandler'
  ),
  defineEventHandler(
    EnvironmentDeletedEvent,
    EnvironmentDeletedActivityHandler,
    'environmentDeletedActivityHandler'
  ),
];

/**
 * Register environment module handlers with the container.
 */
export function registerEnvironmentModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    environmentRepository: asClass(EnvironmentRepository).singleton(),
  });

  // Register query handlers
  container.register({
    getEnvironmentHandler: asClass(GetEnvironmentHandler).singleton(),
    listEnvironmentsHandler: asClass(ListEnvironmentsHandler).singleton(),
  });

  // Register command handlers
  container.register({
    createEnvironmentHandler: asClass(CreateEnvironmentHandler).singleton(),
    updateEnvironmentHandler: asClass(UpdateEnvironmentHandler).singleton(),
    switchBranchHandler: asClass(SwitchBranchHandler).singleton(),
    deleteEnvironmentHandler: asClass(DeleteEnvironmentHandler).singleton(),
  });

  // Register event handlers for activity logging
  container.register({
    environmentCreatedActivityHandler: asClass(EnvironmentCreatedActivityHandler).singleton(),
    environmentUpdatedActivityHandler: asClass(EnvironmentUpdatedActivityHandler).singleton(),
    branchSwitchedActivityHandler: asClass(BranchSwitchedActivityHandler).singleton(),
    environmentDeletedActivityHandler: asClass(EnvironmentDeletedActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
