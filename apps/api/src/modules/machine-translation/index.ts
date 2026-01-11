/**
 * Machine Translation Module
 *
 * CQRS-lite module for machine translation operations.
 * Provides commands, queries, and events for MT configuration and translation.
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
import { DeleteConfigCommand } from './commands/delete-config.command.js';
import { DeleteConfigHandler } from './commands/delete-config.handler.js';
import { QueueBatchTranslateCommand } from './commands/queue-batch-translate.command.js';
import { QueueBatchTranslateHandler } from './commands/queue-batch-translate.handler.js';
import { QueuePreTranslateCommand } from './commands/queue-pre-translate.command.js';
import { QueuePreTranslateHandler } from './commands/queue-pre-translate.handler.js';
import { SaveConfigCommand } from './commands/save-config.command.js';
import { SaveConfigHandler } from './commands/save-config.handler.js';
import { TestConnectionCommand } from './commands/test-connection.command.js';
import { TestConnectionHandler } from './commands/test-connection.handler.js';

// Queries
import { GetConfigsHandler } from './queries/get-configs.handler.js';
import { GetConfigsQuery } from './queries/get-configs.query.js';
import { GetUsageHandler } from './queries/get-usage.handler.js';
import { GetUsageQuery } from './queries/get-usage.query.js';
import { TranslateMultiHandler } from './queries/translate-multi.handler.js';
import { TranslateMultiQuery } from './queries/translate-multi.query.js';
import { TranslateTextHandler } from './queries/translate-text.handler.js';
import { TranslateTextQuery } from './queries/translate-text.query.js';
import { TranslateWithContextHandler } from './queries/translate-with-context.handler.js';
import { TranslateWithContextQuery } from './queries/translate-with-context.query.js';

// Events
import { ConfigDeletedEvent } from './events/config-deleted.event.js';
import { ConfigSavedEvent } from './events/config-saved.event.js';

// Event handlers
import { MTActivityHandler } from './handlers/mt-activity.handler.js';

// Repository
import { MachineTranslationRepository } from './repositories/machine-translation.repository.js';

// Re-export commands
export { DeleteConfigCommand, type DeleteConfigResult } from './commands/delete-config.command.js';
export {
  QueueBatchTranslateCommand,
  type QueueBatchTranslateInput,
  type QueueBatchTranslateResult,
} from './commands/queue-batch-translate.command.js';
export {
  QueuePreTranslateCommand,
  type QueuePreTranslateInput,
  type QueuePreTranslateResult,
} from './commands/queue-pre-translate.command.js';
export { SaveConfigCommand } from './commands/save-config.command.js';
export {
  TestConnectionCommand,
  type TestConnectionResult,
} from './commands/test-connection.command.js';

// Re-export queries
export { GetConfigsQuery, type GetConfigsResult } from './queries/get-configs.query.js';
export { GetUsageQuery, type GetUsageResult } from './queries/get-usage.query.js';
export {
  TranslateMultiQuery,
  type TranslateMultiInput,
  type TranslateMultiResult,
} from './queries/translate-multi.query.js';
export {
  TranslateTextQuery,
  type TranslateTextInput,
  type TranslateTextResult,
} from './queries/translate-text.query.js';
export {
  TranslateWithContextQuery,
  type TranslateWithContextInput,
  type TranslateWithContextResult,
} from './queries/translate-with-context.query.js';

// Re-export types
export type {
  CachedTranslation,
  MTConfigInput,
  MTConfigResponse,
  MTUsageStats,
} from './repositories/machine-translation.repository.js';

// Re-export repository for worker usage
export { MachineTranslationRepository } from './repositories/machine-translation.repository.js';

// Handler registrations
const queryRegistrations = [
  defineQueryHandler(GetConfigsQuery, GetConfigsHandler, 'getConfigsHandler'),
  defineQueryHandler(GetUsageQuery, GetUsageHandler, 'getUsageHandler'),
  defineQueryHandler(TranslateTextQuery, TranslateTextHandler, 'translateTextHandler'),
  defineQueryHandler(TranslateMultiQuery, TranslateMultiHandler, 'translateMultiHandler'),
  defineQueryHandler(
    TranslateWithContextQuery,
    TranslateWithContextHandler,
    'translateWithContextHandler'
  ),
];

const commandRegistrations = [
  defineCommandHandler(SaveConfigCommand, SaveConfigHandler, 'saveConfigHandler'),
  defineCommandHandler(DeleteConfigCommand, DeleteConfigHandler, 'deleteConfigHandler'),
  defineCommandHandler(TestConnectionCommand, TestConnectionHandler, 'testConnectionHandler'),
  defineCommandHandler(
    QueueBatchTranslateCommand,
    QueueBatchTranslateHandler,
    'queueBatchTranslateHandler'
  ),
  defineCommandHandler(
    QueuePreTranslateCommand,
    QueuePreTranslateHandler,
    'queuePreTranslateHandler'
  ),
];

const eventRegistrations = [
  defineEventHandler(ConfigSavedEvent, MTActivityHandler, 'mtActivityHandler'),
  defineEventHandler(ConfigDeletedEvent, MTActivityHandler, 'mtActivityHandler'),
];

/**
 * Register machine translation module handlers with the container.
 */
export function registerMachineTranslationModule(container: AwilixContainer<Cradle>): void {
  container.register({
    // Repository
    machineTranslationRepository: asClass(MachineTranslationRepository).singleton(),

    // Query handlers
    getConfigsHandler: asClass(GetConfigsHandler).singleton(),
    getUsageHandler: asClass(GetUsageHandler).singleton(),
    translateTextHandler: asClass(TranslateTextHandler).singleton(),
    translateMultiHandler: asClass(TranslateMultiHandler).singleton(),
    translateWithContextHandler: asClass(TranslateWithContextHandler).singleton(),

    // Command handlers
    saveConfigHandler: asClass(SaveConfigHandler).singleton(),
    deleteConfigHandler: asClass(DeleteConfigHandler).singleton(),
    testConnectionHandler: asClass(TestConnectionHandler).singleton(),
    queueBatchTranslateHandler: asClass(QueueBatchTranslateHandler).singleton(),
    queuePreTranslateHandler: asClass(QueuePreTranslateHandler).singleton(),

    // Event handlers
    mtActivityHandler: asClass(MTActivityHandler).singleton(),
  });

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
