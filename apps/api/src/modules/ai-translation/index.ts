/**
 * AI Translation Module
 *
 * CQRS-lite module for AI translation operations.
 * Provides commands, queries, and events for AI configuration and translation.
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
import { SaveConfigCommand } from './commands/save-config.command.js';
import { SaveConfigHandler } from './commands/save-config.handler.js';
import { TestConnectionCommand } from './commands/test-connection.command.js';
import { TestConnectionHandler } from './commands/test-connection.handler.js';
import { UpdateContextConfigCommand } from './commands/update-context-config.command.js';
import { UpdateContextConfigHandler } from './commands/update-context-config.handler.js';

// Queries
import { GetConfigsHandler } from './queries/get-configs.handler.js';
import { GetConfigsQuery } from './queries/get-configs.query.js';
import { GetContextConfigHandler } from './queries/get-context-config.handler.js';
import { GetContextConfigQuery } from './queries/get-context-config.query.js';
import { GetSupportedModelsHandler } from './queries/get-supported-models.handler.js';
import { GetSupportedModelsQuery } from './queries/get-supported-models.query.js';
import { GetUsageHandler } from './queries/get-usage.handler.js';
import { GetUsageQuery } from './queries/get-usage.query.js';
import { TranslateHandler } from './queries/translate.handler.js';
import { TranslateQuery } from './queries/translate.query.js';

// Events
import { ConfigDeletedEvent } from './events/config-deleted.event.js';
import { ConfigSavedEvent } from './events/config-saved.event.js';
import { ContextConfigUpdatedEvent } from './events/context-config-updated.event.js';

// Event handlers
import { AIActivityHandler } from './handlers/ai-activity.handler.js';

// Repository
import { AITranslationRepository } from './repositories/ai-translation.repository.js';

// Services
import { AIProviderService } from './services/ai-provider.service.js';

// Re-export commands
export { DeleteConfigCommand, type DeleteConfigResult } from './commands/delete-config.command.js';
export { SaveConfigCommand } from './commands/save-config.command.js';
export {
  TestConnectionCommand,
  type TestConnectionResult,
} from './commands/test-connection.command.js';
export { UpdateContextConfigCommand } from './commands/update-context-config.command.js';

// Re-export queries
export { GetConfigsQuery, type GetConfigsResult } from './queries/get-configs.query.js';
export { GetContextConfigQuery } from './queries/get-context-config.query.js';
export {
  GetSupportedModelsQuery,
  type GetSupportedModelsResult,
} from './queries/get-supported-models.query.js';
export { GetUsageQuery, type GetUsageResult } from './queries/get-usage.query.js';
export {
  TranslateQuery,
  type TranslateInput,
  type TranslateResult,
} from './queries/translate.query.js';

// Re-export types
export type {
  AIConfigInput,
  AIConfigResponse,
  AIContextConfigInput,
  AIUsageStats,
} from './repositories/ai-translation.repository.js';
export type { AIProviderType } from './services/ai-provider.service.js';

// Re-export repository and service for worker usage
export { AITranslationRepository } from './repositories/ai-translation.repository.js';
export { AIProviderService } from './services/ai-provider.service.js';

// Handler registrations
const queryRegistrations = [
  defineQueryHandler(GetConfigsQuery, GetConfigsHandler, 'aiGetConfigsHandler'),
  defineQueryHandler(GetContextConfigQuery, GetContextConfigHandler, 'aiGetContextConfigHandler'),
  defineQueryHandler(
    GetSupportedModelsQuery,
    GetSupportedModelsHandler,
    'aiGetSupportedModelsHandler'
  ),
  defineQueryHandler(GetUsageQuery, GetUsageHandler, 'aiGetUsageHandler'),
  defineQueryHandler(TranslateQuery, TranslateHandler, 'aiTranslateHandler'),
];

const commandRegistrations = [
  defineCommandHandler(SaveConfigCommand, SaveConfigHandler, 'aiSaveConfigHandler'),
  defineCommandHandler(DeleteConfigCommand, DeleteConfigHandler, 'aiDeleteConfigHandler'),
  defineCommandHandler(
    UpdateContextConfigCommand,
    UpdateContextConfigHandler,
    'aiUpdateContextConfigHandler'
  ),
  defineCommandHandler(TestConnectionCommand, TestConnectionHandler, 'aiTestConnectionHandler'),
];

const eventRegistrations = [
  defineEventHandler(ConfigSavedEvent, AIActivityHandler, 'aiActivityHandler'),
  defineEventHandler(ConfigDeletedEvent, AIActivityHandler, 'aiActivityHandler'),
  defineEventHandler(ContextConfigUpdatedEvent, AIActivityHandler, 'aiActivityHandler'),
];

/**
 * Register AI translation module handlers with the container.
 */
export function registerAITranslationModule(container: AwilixContainer<Cradle>): void {
  container.register({
    // Services
    aiProviderService: asClass(AIProviderService).singleton(),

    // Repository (named to match handler constructor parameters)
    aiRepository: asClass(AITranslationRepository).singleton(),

    // Query handlers
    aiGetConfigsHandler: asClass(GetConfigsHandler).singleton(),
    aiGetContextConfigHandler: asClass(GetContextConfigHandler).singleton(),
    aiGetSupportedModelsHandler: asClass(GetSupportedModelsHandler).singleton(),
    aiGetUsageHandler: asClass(GetUsageHandler).singleton(),
    aiTranslateHandler: asClass(TranslateHandler).singleton(),

    // Command handlers
    aiSaveConfigHandler: asClass(SaveConfigHandler).singleton(),
    aiDeleteConfigHandler: asClass(DeleteConfigHandler).singleton(),
    aiUpdateContextConfigHandler: asClass(UpdateContextConfigHandler).singleton(),
    aiTestConnectionHandler: asClass(TestConnectionHandler).singleton(),

    // Event handlers
    aiActivityHandler: asClass(AIActivityHandler).singleton(),
  });

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
