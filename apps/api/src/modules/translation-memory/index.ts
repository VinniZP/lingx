/**
 * Translation Memory Module
 *
 * CQRS-lite module for translation memory operations.
 * Provides queries for searching/stats and commands for usage tracking/reindexing.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import {
  defineCommandHandler,
  defineQueryHandler,
  registerCommandHandlers,
  registerQueryHandlers,
} from '../../shared/cqrs/index.js';

import { BulkIndexTMCommand } from './commands/bulk-index-tm.command.js';
import { BulkIndexTMHandler } from './commands/bulk-index-tm.handler.js';
import { IndexApprovedTranslationCommand } from './commands/index-approved-translation.command.js';
import { IndexApprovedTranslationHandler } from './commands/index-approved-translation.handler.js';
import { RecordTMUsageCommand } from './commands/record-tm-usage.command.js';
import { RecordTMUsageHandler } from './commands/record-tm-usage.handler.js';
import { ReindexTMCommand } from './commands/reindex-tm.command.js';
import { ReindexTMHandler } from './commands/reindex-tm.handler.js';
import { RemoveBySourceKeyCommand } from './commands/remove-by-source-key.command.js';
import { RemoveBySourceKeyHandler } from './commands/remove-by-source-key.handler.js';
import { UpdateTMUsageCommand } from './commands/update-tm-usage.command.js';
import { UpdateTMUsageHandler } from './commands/update-tm-usage.handler.js';
import { GetTMStatsHandler } from './queries/get-tm-stats.handler.js';
import { GetTMStatsQuery } from './queries/get-tm-stats.query.js';
import { SearchTMHandler } from './queries/search-tm.handler.js';
import { SearchTMQuery } from './queries/search-tm.query.js';
import { TranslationMemoryRepository } from './repositories/translation-memory.repository.js';

// Re-export queries
export { GetTMStatsQuery } from './queries/get-tm-stats.query.js';
export { SearchTMQuery, type SearchTMResult } from './queries/search-tm.query.js';

// Re-export commands
export { BulkIndexTMCommand, type BulkIndexTMResult } from './commands/bulk-index-tm.command.js';
export { IndexApprovedTranslationCommand } from './commands/index-approved-translation.command.js';
export {
  RecordTMUsageCommand,
  type RecordTMUsageResult,
} from './commands/record-tm-usage.command.js';
export { ReindexTMCommand, type ReindexTMResult } from './commands/reindex-tm.command.js';
export {
  RemoveBySourceKeyCommand,
  type RemoveBySourceKeyResult,
} from './commands/remove-by-source-key.command.js';
export { UpdateTMUsageCommand } from './commands/update-tm-usage.command.js';

// Re-export types
export type {
  ApprovedTranslationRow,
  TMIndexInput,
  TMMatch,
  TMSearchOptions,
  TMStats,
  TranslationWithContext,
} from './repositories/translation-memory.repository.js';

const queryRegistrations = [
  defineQueryHandler(SearchTMQuery, SearchTMHandler, 'searchTMHandler'),
  defineQueryHandler(GetTMStatsQuery, GetTMStatsHandler, 'getTMStatsHandler'),
];

const commandRegistrations = [
  // Commands that queue jobs (called from routes)
  defineCommandHandler(RecordTMUsageCommand, RecordTMUsageHandler, 'recordTMUsageHandler'),
  defineCommandHandler(ReindexTMCommand, ReindexTMHandler, 'reindexTMHandler'),
  // Commands that do the actual work (called from worker)
  defineCommandHandler(
    IndexApprovedTranslationCommand,
    IndexApprovedTranslationHandler,
    'indexApprovedTranslationHandler'
  ),
  defineCommandHandler(BulkIndexTMCommand, BulkIndexTMHandler, 'bulkIndexTMHandler'),
  defineCommandHandler(UpdateTMUsageCommand, UpdateTMUsageHandler, 'updateTMUsageHandler'),
  defineCommandHandler(
    RemoveBySourceKeyCommand,
    RemoveBySourceKeyHandler,
    'removeBySourceKeyHandler'
  ),
];

/**
 * Register translation memory module handlers with the container.
 */
export function registerTranslationMemoryModule(container: AwilixContainer<Cradle>): void {
  container.register({
    // Repository
    translationMemoryRepository: asClass(TranslationMemoryRepository).singleton(),
    // Query handlers
    searchTMHandler: asClass(SearchTMHandler).singleton(),
    getTMStatsHandler: asClass(GetTMStatsHandler).singleton(),
    // Command handlers (route-facing, queue jobs)
    recordTMUsageHandler: asClass(RecordTMUsageHandler).singleton(),
    reindexTMHandler: asClass(ReindexTMHandler).singleton(),
    // Command handlers (worker-facing, do actual work)
    indexApprovedTranslationHandler: asClass(IndexApprovedTranslationHandler).singleton(),
    bulkIndexTMHandler: asClass(BulkIndexTMHandler).singleton(),
    updateTMUsageHandler: asClass(UpdateTMUsageHandler).singleton(),
    removeBySourceKeyHandler: asClass(RemoveBySourceKeyHandler).singleton(),
  });

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);
}
