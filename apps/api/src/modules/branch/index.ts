/**
 * Branch Module
 *
 * CQRS-lite module for branch management.
 * Provides commands for create/delete/merge operations
 * and queries for retrieving branches and computing diffs.
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

// Repositories
import { BranchRepository } from './repositories/branch.repository.js';
import { TranslationKeyRepository } from './repositories/translation-key.repository.js';
import { TranslationRepository } from './repositories/translation.repository.js';

// Services
import { DiffCalculator } from './services/diff-calculator.js';
import { MergeExecutor } from './services/merge-executor.js';

// Query handlers
import { ComputeDiffHandler } from './queries/compute-diff.handler.js';
import { GetBranchHandler } from './queries/get-branch.handler.js';
import { ListBranchesHandler } from './queries/list-branches.handler.js';

// Command handlers
import { CreateBranchHandler } from './commands/create-branch.handler.js';
import { DeleteBranchHandler } from './commands/delete-branch.handler.js';
import { MergeBranchesHandler } from './commands/merge-branches.handler.js';

// Queries
import { ComputeDiffQuery } from './queries/compute-diff.query.js';
import { GetBranchQuery } from './queries/get-branch.query.js';
import { ListBranchesQuery } from './queries/list-branches.query.js';

// Commands
import { CreateBranchCommand } from './commands/create-branch.command.js';
import { DeleteBranchCommand } from './commands/delete-branch.command.js';
import { MergeBranchesCommand } from './commands/merge-branches.command.js';

// Events
import { BranchCreatedEvent } from './events/branch-created.event.js';
import { BranchDeletedEvent } from './events/branch-deleted.event.js';
import { BranchesMergedEvent } from './events/branches-merged.event.js';

// Event handlers
import {
  BranchCreatedActivityHandler,
  BranchDeletedActivityHandler,
  BranchesMergedActivityHandler,
} from './handlers/branch-activity.handler.js';

// Re-export queries and commands for external use
export { ComputeDiffQuery } from './queries/compute-diff.query.js';
export { GetBranchQuery } from './queries/get-branch.query.js';
export { ListBranchesQuery } from './queries/list-branches.query.js';

export { CreateBranchCommand } from './commands/create-branch.command.js';
export { DeleteBranchCommand } from './commands/delete-branch.command.js';
export { MergeBranchesCommand } from './commands/merge-branches.command.js';

// Re-export events
export { BranchCreatedEvent } from './events/branch-created.event.js';
export { BranchDeletedEvent } from './events/branch-deleted.event.js';
export { BranchesMergedEvent } from './events/branches-merged.event.js';

// Re-export types from repository
export type {
  BranchWithDetails,
  BranchWithKeyCount,
  BranchWithSpace,
} from './repositories/branch.repository.js';

// Type-safe handler registrations
const queryRegistrations = [
  defineQueryHandler(ListBranchesQuery, ListBranchesHandler, 'listBranchesHandler'),
  defineQueryHandler(GetBranchQuery, GetBranchHandler, 'getBranchHandler'),
  defineQueryHandler(ComputeDiffQuery, ComputeDiffHandler, 'computeDiffHandler'),
];

const commandRegistrations = [
  defineCommandHandler(CreateBranchCommand, CreateBranchHandler, 'createBranchHandler'),
  defineCommandHandler(DeleteBranchCommand, DeleteBranchHandler, 'deleteBranchHandler'),
  defineCommandHandler(MergeBranchesCommand, MergeBranchesHandler, 'mergeBranchesHandler'),
];

const eventRegistrations = [
  defineEventHandler(
    BranchCreatedEvent,
    BranchCreatedActivityHandler,
    'branchCreatedActivityHandler'
  ),
  defineEventHandler(
    BranchDeletedEvent,
    BranchDeletedActivityHandler,
    'branchDeletedActivityHandler'
  ),
  defineEventHandler(
    BranchesMergedEvent,
    BranchesMergedActivityHandler,
    'branchesMergedActivityHandler'
  ),
];

/**
 * Register branch module handlers with the container.
 */
export function registerBranchModule(container: AwilixContainer<Cradle>): void {
  // Register repositories
  container.register({
    branchRepository: asClass(BranchRepository).singleton(),
    translationKeyRepository: asClass(TranslationKeyRepository).singleton(),
    translationRepository: asClass(TranslationRepository).singleton(),
  });

  // Register services (injected with repositories)
  container.register({
    diffCalculator: asClass(DiffCalculator).singleton(),
    mergeExecutor: asClass(MergeExecutor).singleton(),
  });

  // Register query handlers
  container.register({
    listBranchesHandler: asClass(ListBranchesHandler).singleton(),
    getBranchHandler: asClass(GetBranchHandler).singleton(),
    computeDiffHandler: asClass(ComputeDiffHandler).singleton(),
  });

  // Register command handlers
  container.register({
    createBranchHandler: asClass(CreateBranchHandler).singleton(),
    deleteBranchHandler: asClass(DeleteBranchHandler).singleton(),
    mergeBranchesHandler: asClass(MergeBranchesHandler).singleton(),
  });

  // Register event handlers for activity logging
  container.register({
    branchCreatedActivityHandler: asClass(BranchCreatedActivityHandler).singleton(),
    branchDeletedActivityHandler: asClass(BranchDeletedActivityHandler).singleton(),
    branchesMergedActivityHandler: asClass(BranchesMergedActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
