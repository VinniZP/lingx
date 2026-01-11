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

import { RecordTMUsageCommand } from './commands/record-tm-usage.command.js';
import { RecordTMUsageHandler } from './commands/record-tm-usage.handler.js';
import { ReindexTMCommand } from './commands/reindex-tm.command.js';
import { ReindexTMHandler } from './commands/reindex-tm.handler.js';
import { GetTMStatsHandler } from './queries/get-tm-stats.handler.js';
import { GetTMStatsQuery } from './queries/get-tm-stats.query.js';
import { SearchTMHandler } from './queries/search-tm.handler.js';
import { SearchTMQuery } from './queries/search-tm.query.js';
import { TranslationMemoryRepository } from './repositories/translation-memory.repository.js';

// Re-export queries
export { GetTMStatsQuery } from './queries/get-tm-stats.query.js';
export { SearchTMQuery, type SearchTMResult } from './queries/search-tm.query.js';

// Re-export commands
export {
  RecordTMUsageCommand,
  type RecordTMUsageResult,
} from './commands/record-tm-usage.command.js';
export { ReindexTMCommand, type ReindexTMResult } from './commands/reindex-tm.command.js';

// Re-export types
export type {
  TMMatch,
  TMSearchOptions,
  TMStats,
} from './repositories/translation-memory.repository.js';

const queryRegistrations = [
  defineQueryHandler(SearchTMQuery, SearchTMHandler, 'searchTMHandler'),
  defineQueryHandler(GetTMStatsQuery, GetTMStatsHandler, 'getTMStatsHandler'),
];

const commandRegistrations = [
  defineCommandHandler(RecordTMUsageCommand, RecordTMUsageHandler, 'recordTMUsageHandler'),
  defineCommandHandler(ReindexTMCommand, ReindexTMHandler, 'reindexTMHandler'),
];

/**
 * Register translation memory module handlers with the container.
 */
export function registerTranslationMemoryModule(container: AwilixContainer<Cradle>): void {
  container.register({
    translationMemoryRepository: asClass(TranslationMemoryRepository).singleton(),
    searchTMHandler: asClass(SearchTMHandler).singleton(),
    getTMStatsHandler: asClass(GetTMStatsHandler).singleton(),
    recordTMUsageHandler: asClass(RecordTMUsageHandler).singleton(),
    reindexTMHandler: asClass(ReindexTMHandler).singleton(),
  });

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);
}
