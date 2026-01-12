/**
 * Glossary Module
 *
 * CQRS-lite module for glossary/termbase operations.
 * Provides commands, queries, and events for glossary management.
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

// Commands
import { CreateEntryCommand } from './commands/create-entry.command.js';
import { CreateEntryHandler } from './commands/create-entry.handler.js';
import { CreateTagCommand } from './commands/create-tag.command.js';
import { CreateTagHandler } from './commands/create-tag.handler.js';
import { DeleteEntryCommand } from './commands/delete-entry.command.js';
import { DeleteEntryHandler } from './commands/delete-entry.handler.js';
import { DeleteTagCommand } from './commands/delete-tag.command.js';
import { DeleteTagHandler } from './commands/delete-tag.handler.js';
import { DeleteTranslationCommand } from './commands/delete-translation.command.js';
import { DeleteTranslationHandler } from './commands/delete-translation.handler.js';
import { ImportGlossaryCommand } from './commands/import-glossary.command.js';
import { ImportGlossaryHandler } from './commands/import-glossary.handler.js';
import { RecordUsageCommand } from './commands/record-usage.command.js';
import { RecordUsageHandler } from './commands/record-usage.handler.js';
import { UpdateEntryCommand } from './commands/update-entry.command.js';
import { UpdateEntryHandler } from './commands/update-entry.handler.js';
import { UpdateTagCommand } from './commands/update-tag.command.js';
import { UpdateTagHandler } from './commands/update-tag.handler.js';
import { UpsertTranslationCommand } from './commands/upsert-translation.command.js';
import { UpsertTranslationHandler } from './commands/upsert-translation.handler.js';

// Queries
import { ExportGlossaryHandler } from './queries/export-glossary.handler.js';
import { ExportGlossaryQuery } from './queries/export-glossary.query.js';
import { GetEntryHandler } from './queries/get-entry.handler.js';
import { GetEntryQuery } from './queries/get-entry.query.js';
import { GetStatsHandler } from './queries/get-stats.handler.js';
import { GetStatsQuery } from './queries/get-stats.query.js';
import { ListEntriesHandler } from './queries/list-entries.handler.js';
import { ListEntriesQuery } from './queries/list-entries.query.js';
import { ListTagsHandler } from './queries/list-tags.handler.js';
import { ListTagsQuery } from './queries/list-tags.query.js';
import { SearchInTextHandler } from './queries/search-in-text.handler.js';
import { SearchInTextQuery } from './queries/search-in-text.query.js';

// Events
import { GlossaryEntryCreatedEvent } from './events/glossary-entry-created.event.js';
import { GlossaryEntryDeletedEvent } from './events/glossary-entry-deleted.event.js';
import { GlossaryEntryUpdatedEvent } from './events/glossary-entry-updated.event.js';
import { GlossaryImportedEvent } from './events/glossary-imported.event.js';
import { GlossaryTagCreatedEvent } from './events/glossary-tag-created.event.js';
import { GlossaryTagDeletedEvent } from './events/glossary-tag-deleted.event.js';
import { GlossaryTagUpdatedEvent } from './events/glossary-tag-updated.event.js';
import { GlossaryTranslationDeletedEvent } from './events/glossary-translation-deleted.event.js';
import { GlossaryTranslationUpdatedEvent } from './events/glossary-translation-updated.event.js';

// Event handlers
import { GlossaryActivityHandler } from './handlers/glossary-activity.handler.js';

// Repository
import { GlossaryRepository } from './repositories/glossary.repository.js';

// Re-export queries
export { ExportGlossaryQuery, type ExportGlossaryResult } from './queries/export-glossary.query.js';
export { GetEntryQuery, type GetEntryResult } from './queries/get-entry.query.js';
export { GetStatsQuery } from './queries/get-stats.query.js';
export { ListEntriesQuery, type ListEntriesResult } from './queries/list-entries.query.js';
export { ListTagsQuery, type ListTagsResult } from './queries/list-tags.query.js';
export { SearchInTextQuery, type SearchInTextResult } from './queries/search-in-text.query.js';

// Re-export commands
export { CreateEntryCommand } from './commands/create-entry.command.js';
export { CreateTagCommand } from './commands/create-tag.command.js';
export { DeleteEntryCommand, type DeleteEntryResult } from './commands/delete-entry.command.js';
export { DeleteTagCommand, type DeleteTagResult } from './commands/delete-tag.command.js';
export {
  DeleteTranslationCommand,
  type DeleteTranslationResult,
} from './commands/delete-translation.command.js';
export { ImportGlossaryCommand } from './commands/import-glossary.command.js';
export { RecordUsageCommand, type RecordUsageResult } from './commands/record-usage.command.js';
export { UpdateEntryCommand } from './commands/update-entry.command.js';
export { UpdateTagCommand } from './commands/update-tag.command.js';
export {
  UpsertTranslationCommand,
  type UpsertTranslationResult,
} from './commands/upsert-translation.command.js';

// Re-export types
export type {
  GlossaryEntryWithRelations,
  GlossaryMatch,
  GlossaryStats,
  GlossaryTag,
  GlossaryTagWithCount,
  ImportResult,
} from './repositories/glossary.repository.js';

// Re-export repository for worker usage
export { GlossaryRepository } from './repositories/glossary.repository.js';

// Handler registrations
const queryRegistrations = [
  defineQueryHandler(GetEntryQuery, GetEntryHandler, 'getEntryHandler'),
  defineQueryHandler(ListEntriesQuery, ListEntriesHandler, 'listEntriesHandler'),
  defineQueryHandler(SearchInTextQuery, SearchInTextHandler, 'searchInTextHandler'),
  defineQueryHandler(ListTagsQuery, ListTagsHandler, 'listTagsHandler'),
  defineQueryHandler(GetStatsQuery, GetStatsHandler, 'getStatsHandler'),
  defineQueryHandler(ExportGlossaryQuery, ExportGlossaryHandler, 'exportGlossaryHandler'),
];

const commandRegistrations = [
  defineCommandHandler(CreateEntryCommand, CreateEntryHandler, 'createEntryHandler'),
  defineCommandHandler(UpdateEntryCommand, UpdateEntryHandler, 'updateEntryHandler'),
  defineCommandHandler(DeleteEntryCommand, DeleteEntryHandler, 'deleteEntryHandler'),
  defineCommandHandler(
    UpsertTranslationCommand,
    UpsertTranslationHandler,
    'upsertTranslationHandler'
  ),
  defineCommandHandler(
    DeleteTranslationCommand,
    DeleteTranslationHandler,
    'deleteTranslationHandler'
  ),
  defineCommandHandler(RecordUsageCommand, RecordUsageHandler, 'recordUsageHandler'),
  defineCommandHandler(CreateTagCommand, CreateTagHandler, 'createTagHandler'),
  defineCommandHandler(UpdateTagCommand, UpdateTagHandler, 'updateTagHandler'),
  defineCommandHandler(DeleteTagCommand, DeleteTagHandler, 'deleteTagHandler'),
  defineCommandHandler(ImportGlossaryCommand, ImportGlossaryHandler, 'importGlossaryHandler'),
];

const eventRegistrations = [
  defineEventHandler(GlossaryEntryCreatedEvent, GlossaryActivityHandler, 'glossaryActivityHandler'),
  defineEventHandler(GlossaryEntryUpdatedEvent, GlossaryActivityHandler, 'glossaryActivityHandler'),
  defineEventHandler(GlossaryEntryDeletedEvent, GlossaryActivityHandler, 'glossaryActivityHandler'),
  defineEventHandler(
    GlossaryTranslationUpdatedEvent,
    GlossaryActivityHandler,
    'glossaryActivityHandler'
  ),
  defineEventHandler(
    GlossaryTranslationDeletedEvent,
    GlossaryActivityHandler,
    'glossaryActivityHandler'
  ),
  defineEventHandler(GlossaryTagCreatedEvent, GlossaryActivityHandler, 'glossaryActivityHandler'),
  defineEventHandler(GlossaryTagUpdatedEvent, GlossaryActivityHandler, 'glossaryActivityHandler'),
  defineEventHandler(GlossaryTagDeletedEvent, GlossaryActivityHandler, 'glossaryActivityHandler'),
  defineEventHandler(GlossaryImportedEvent, GlossaryActivityHandler, 'glossaryActivityHandler'),
];

/**
 * Register glossary module handlers with the container.
 */
export function registerGlossaryModule(container: AwilixContainer<Cradle>): void {
  container.register({
    // Repository
    glossaryRepository: asClass(GlossaryRepository).singleton(),

    // Query handlers
    getEntryHandler: asClass(GetEntryHandler).singleton(),
    listEntriesHandler: asClass(ListEntriesHandler).singleton(),
    searchInTextHandler: asClass(SearchInTextHandler).singleton(),
    listTagsHandler: asClass(ListTagsHandler).singleton(),
    getStatsHandler: asClass(GetStatsHandler).singleton(),
    exportGlossaryHandler: asClass(ExportGlossaryHandler).singleton(),

    // Command handlers
    createEntryHandler: asClass(CreateEntryHandler).singleton(),
    updateEntryHandler: asClass(UpdateEntryHandler).singleton(),
    deleteEntryHandler: asClass(DeleteEntryHandler).singleton(),
    upsertTranslationHandler: asClass(UpsertTranslationHandler).singleton(),
    deleteTranslationHandler: asClass(DeleteTranslationHandler).singleton(),
    recordUsageHandler: asClass(RecordUsageHandler).singleton(),
    createTagHandler: asClass(CreateTagHandler).singleton(),
    updateTagHandler: asClass(UpdateTagHandler).singleton(),
    deleteTagHandler: asClass(DeleteTagHandler).singleton(),
    importGlossaryHandler: asClass(ImportGlossaryHandler).singleton(),

    // Event handlers
    glossaryActivityHandler: asClass(GlossaryActivityHandler).singleton(),
  });

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
