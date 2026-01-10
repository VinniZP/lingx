/**
 * Translation Module
 *
 * CQRS-lite module for translation key and value management.
 * Provides commands for CRUD operations and queries for retrieval.
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
import { TranslationRepository } from './repositories/translation.repository.js';

// Query handlers
import { GetBranchTranslationsHandler } from './queries/get-branch-translations.handler.js';
import { GetKeyHandler } from './queries/get-key.handler.js';
import { ListKeysHandler } from './queries/list-keys.handler.js';
import { ListNamespacesHandler } from './queries/list-namespaces.handler.js';

// Command handlers
import { BatchApprovalHandler } from './commands/batch-approval.handler.js';
import { BatchTranslateKeysHandler } from './commands/batch-translate-keys.handler.js';
import { BulkDeleteKeysHandler } from './commands/bulk-delete-keys.handler.js';
import { BulkTranslateSyncHandler } from './commands/bulk-translate-sync.handler.js';
import { BulkTranslateHandler } from './commands/bulk-translate.handler.js';
import { BulkUpdateTranslationsHandler } from './commands/bulk-update-translations.handler.js';
import { CleanupMTCacheHandler } from './commands/cleanup-mt-cache.handler.js';
import { CreateKeyHandler } from './commands/create-key.handler.js';
import { DeleteKeyHandler } from './commands/delete-key.handler.js';
import { PreTranslateHandler } from './commands/pre-translate.handler.js';
import { QualityBatchHandler } from './commands/quality-batch.handler.js';
import { SetApprovalStatusHandler } from './commands/set-approval-status.handler.js';
import { SetTranslationHandler } from './commands/set-translation.handler.js';
import { UpdateKeyTranslationsHandler } from './commands/update-key-translations.handler.js';
import { UpdateKeyHandler } from './commands/update-key.handler.js';

// Queries
import { GetBranchTranslationsQuery } from './queries/get-branch-translations.query.js';
import { GetKeyQuery } from './queries/get-key.query.js';
import { ListKeysQuery } from './queries/list-keys.query.js';
import { ListNamespacesQuery } from './queries/list-namespaces.query.js';

// Commands
import { BatchApprovalCommand } from './commands/batch-approval.command.js';
import { BatchTranslateKeysCommand } from './commands/batch-translate-keys.command.js';
import { BulkDeleteKeysCommand } from './commands/bulk-delete-keys.command.js';
import { BulkTranslateSyncCommand } from './commands/bulk-translate-sync.command.js';
import { BulkTranslateCommand } from './commands/bulk-translate.command.js';
import { BulkUpdateTranslationsCommand } from './commands/bulk-update-translations.command.js';
import { CleanupMTCacheCommand } from './commands/cleanup-mt-cache.command.js';
import { CreateKeyCommand } from './commands/create-key.command.js';
import { DeleteKeyCommand } from './commands/delete-key.command.js';
import { PreTranslateCommand } from './commands/pre-translate.command.js';
import { QualityBatchCommand } from './commands/quality-batch.command.js';
import { SetApprovalStatusCommand } from './commands/set-approval-status.command.js';
import { SetTranslationCommand } from './commands/set-translation.command.js';
import { UpdateKeyTranslationsCommand } from './commands/update-key-translations.command.js';
import { UpdateKeyCommand } from './commands/update-key.command.js';

// Events
import { KeyCreatedEvent } from './events/key-created.event.js';
import { KeyDeletedEvent, KeysDeletedEvent } from './events/key-deleted.event.js';
import { KeyUpdatedEvent } from './events/key-updated.event.js';
// QualityScoresUpdatedEvent is imported and re-exported below
import {
  TranslationApprovedEvent,
  TranslationsBatchApprovedEvent,
} from './events/translation-approved.event.js';
import {
  KeyTranslationsUpdatedEvent,
  TranslationUpdatedEvent,
} from './events/translation-updated.event.js';
import { TranslationsImportedEvent } from './events/translations-imported.event.js';

// Event handlers
import { TranslationActivityHandler } from './handlers/translation-activity.handler.js';
import { TranslationMemoryHandler } from './handlers/translation-memory.handler.js';

// Re-export queries and commands for external use
export { GetBranchTranslationsQuery } from './queries/get-branch-translations.query.js';
export { GetKeyQuery } from './queries/get-key.query.js';
export { ListKeysQuery } from './queries/list-keys.query.js';
export { ListNamespacesQuery } from './queries/list-namespaces.query.js';

export { BatchApprovalCommand } from './commands/batch-approval.command.js';
export {
  BatchTranslateKeysCommand,
  type BatchTranslateKeysResult,
} from './commands/batch-translate-keys.command.js';
export { BulkDeleteKeysCommand } from './commands/bulk-delete-keys.command.js';
export {
  BulkTranslateSyncCommand,
  type BulkTranslateProgress,
  type BulkTranslateSyncResult,
} from './commands/bulk-translate-sync.command.js';
export { BulkTranslateCommand } from './commands/bulk-translate.command.js';
export { BulkUpdateTranslationsCommand } from './commands/bulk-update-translations.command.js';
export {
  CleanupMTCacheCommand,
  type CleanupMTCacheResult,
} from './commands/cleanup-mt-cache.command.js';
export { CreateKeyCommand } from './commands/create-key.command.js';
export { DeleteKeyCommand } from './commands/delete-key.command.js';
export { PreTranslateCommand, type PreTranslateResult } from './commands/pre-translate.command.js';
export { QualityBatchCommand, type QualityBatchResult } from './commands/quality-batch.command.js';
export { SetApprovalStatusCommand } from './commands/set-approval-status.command.js';
export { SetTranslationCommand } from './commands/set-translation.command.js';
export { UpdateKeyTranslationsCommand } from './commands/update-key-translations.command.js';
export { UpdateKeyCommand } from './commands/update-key.command.js';

// Re-export events
export { KeyCreatedEvent } from './events/key-created.event.js';
export { KeyDeletedEvent, KeysDeletedEvent } from './events/key-deleted.event.js';
export { KeyUpdatedEvent } from './events/key-updated.event.js';
export { QualityScoresUpdatedEvent } from './events/quality-scores-updated.event.js';
export {
  TranslationApprovedEvent,
  TranslationsBatchApprovedEvent,
} from './events/translation-approved.event.js';
export {
  KeyTranslationsUpdatedEvent,
  TranslationUpdatedEvent,
} from './events/translation-updated.event.js';
export { TranslationsImportedEvent } from './events/translations-imported.event.js';

// Re-export types from repository
export type {
  BranchTranslations,
  BulkUpdateResult,
  KeyFilter,
  KeyListResult,
  KeyWithTranslations,
  ListKeysOptions,
  NamespaceCount,
  QualityFilter,
} from './repositories/translation.repository.js';

// Type-safe handler registrations
const queryRegistrations = [
  defineQueryHandler(ListKeysQuery, ListKeysHandler, 'listKeysHandler'),
  defineQueryHandler(GetKeyQuery, GetKeyHandler, 'getKeyHandler'),
  defineQueryHandler(ListNamespacesQuery, ListNamespacesHandler, 'listNamespacesHandler'),
  defineQueryHandler(
    GetBranchTranslationsQuery,
    GetBranchTranslationsHandler,
    'getBranchTranslationsHandler'
  ),
];

const commandRegistrations = [
  defineCommandHandler(CreateKeyCommand, CreateKeyHandler, 'createKeyHandler'),
  defineCommandHandler(UpdateKeyCommand, UpdateKeyHandler, 'updateKeyHandler'),
  defineCommandHandler(DeleteKeyCommand, DeleteKeyHandler, 'deleteKeyHandler'),
  defineCommandHandler(BulkDeleteKeysCommand, BulkDeleteKeysHandler, 'bulkDeleteKeysHandler'),
  defineCommandHandler(SetTranslationCommand, SetTranslationHandler, 'setTranslationHandler'),
  defineCommandHandler(
    UpdateKeyTranslationsCommand,
    UpdateKeyTranslationsHandler,
    'updateKeyTranslationsHandler'
  ),
  defineCommandHandler(
    SetApprovalStatusCommand,
    SetApprovalStatusHandler,
    'setApprovalStatusHandler'
  ),
  defineCommandHandler(BatchApprovalCommand, BatchApprovalHandler, 'batchApprovalHandler'),
  defineCommandHandler(
    BulkUpdateTranslationsCommand,
    BulkUpdateTranslationsHandler,
    'bulkUpdateTranslationsHandler'
  ),
  defineCommandHandler(BulkTranslateCommand, BulkTranslateHandler, 'bulkTranslateHandler'),
  defineCommandHandler(
    BulkTranslateSyncCommand,
    BulkTranslateSyncHandler,
    'bulkTranslateSyncHandler'
  ),
  defineCommandHandler(
    BatchTranslateKeysCommand,
    BatchTranslateKeysHandler,
    'batchTranslateKeysHandler'
  ),
  defineCommandHandler(PreTranslateCommand, PreTranslateHandler, 'preTranslateHandler'),
  defineCommandHandler(QualityBatchCommand, QualityBatchHandler, 'qualityBatchHandler'),
  defineCommandHandler(CleanupMTCacheCommand, CleanupMTCacheHandler, 'cleanupMTCacheHandler'),
];

const eventRegistrations = [
  // Activity logging for all events
  defineEventHandler(KeyCreatedEvent, TranslationActivityHandler, 'translationActivityHandler'),
  defineEventHandler(KeyUpdatedEvent, TranslationActivityHandler, 'translationActivityHandler'),
  defineEventHandler(KeyDeletedEvent, TranslationActivityHandler, 'translationActivityHandler'),
  defineEventHandler(KeysDeletedEvent, TranslationActivityHandler, 'translationActivityHandler'),
  defineEventHandler(
    TranslationUpdatedEvent,
    TranslationActivityHandler,
    'translationActivityHandler'
  ),
  defineEventHandler(
    KeyTranslationsUpdatedEvent,
    TranslationActivityHandler,
    'translationActivityHandler'
  ),
  defineEventHandler(
    TranslationApprovedEvent,
    TranslationActivityHandler,
    'translationActivityHandler'
  ),
  defineEventHandler(
    TranslationsBatchApprovedEvent,
    TranslationActivityHandler,
    'translationActivityHandler'
  ),
  defineEventHandler(
    TranslationsImportedEvent,
    TranslationActivityHandler,
    'translationActivityHandler'
  ),
  // Translation memory indexing for approved translations
  defineEventHandler(
    TranslationApprovedEvent,
    TranslationMemoryHandler,
    'translationMemoryHandler'
  ),
  defineEventHandler(
    TranslationsBatchApprovedEvent,
    TranslationMemoryHandler,
    'translationMemoryHandler'
  ),
];

/**
 * Register translation module handlers with the container.
 */
export function registerTranslationModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    translationRepository: asClass(TranslationRepository).singleton(),
  });

  // Register query handlers
  container.register({
    listKeysHandler: asClass(ListKeysHandler).singleton(),
    getKeyHandler: asClass(GetKeyHandler).singleton(),
    listNamespacesHandler: asClass(ListNamespacesHandler).singleton(),
    getBranchTranslationsHandler: asClass(GetBranchTranslationsHandler).singleton(),
  });

  // Register command handlers
  container.register({
    createKeyHandler: asClass(CreateKeyHandler).singleton(),
    updateKeyHandler: asClass(UpdateKeyHandler).singleton(),
    deleteKeyHandler: asClass(DeleteKeyHandler).singleton(),
    bulkDeleteKeysHandler: asClass(BulkDeleteKeysHandler).singleton(),
    setTranslationHandler: asClass(SetTranslationHandler).singleton(),
    updateKeyTranslationsHandler: asClass(UpdateKeyTranslationsHandler).singleton(),
    setApprovalStatusHandler: asClass(SetApprovalStatusHandler).singleton(),
    batchApprovalHandler: asClass(BatchApprovalHandler).singleton(),
    bulkUpdateTranslationsHandler: asClass(BulkUpdateTranslationsHandler).singleton(),
    bulkTranslateHandler: asClass(BulkTranslateHandler).singleton(),
    bulkTranslateSyncHandler: asClass(BulkTranslateSyncHandler).singleton(),
    batchTranslateKeysHandler: asClass(BatchTranslateKeysHandler).singleton(),
    preTranslateHandler: asClass(PreTranslateHandler).singleton(),
    qualityBatchHandler: asClass(QualityBatchHandler).singleton(),
    cleanupMTCacheHandler: asClass(CleanupMTCacheHandler).singleton(),
  });

  // Register event handlers
  container.register({
    translationActivityHandler: asClass(TranslationActivityHandler).singleton(),
    translationMemoryHandler: asClass(TranslationMemoryHandler).singleton(),
  });

  // Register handlers with buses
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
