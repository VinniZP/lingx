/**
 * Key Context Module
 *
 * CQRS-lite module for key context operations.
 * Provides commands, queries, and events for near-key context detection
 * and relationship management.
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
import { AnalyzeRelationshipsCommand } from './commands/analyze-relationships.command.js';
import { AnalyzeRelationshipsHandler } from './commands/analyze-relationships.handler.js';
import { BulkUpdateKeyContextCommand } from './commands/bulk-update-key-context.command.js';
import { BulkUpdateKeyContextHandler } from './commands/bulk-update-key-context.handler.js';

// Queries
import { GetAIContextHandler } from './queries/get-ai-context.handler.js';
import { GetAIContextQuery } from './queries/get-ai-context.query.js';
import { GetContextStatsHandler } from './queries/get-context-stats.handler.js';
import { GetContextStatsQuery } from './queries/get-context-stats.query.js';
import { GetRelatedKeysHandler } from './queries/get-related-keys.handler.js';
import { GetRelatedKeysQuery } from './queries/get-related-keys.query.js';

// Events
import { KeyContextUpdatedEvent } from './events/key-context-updated.event.js';
import { RelationshipsAnalyzedEvent } from './events/relationships-analyzed.event.js';

// Event handlers
import { KeyContextActivityHandler } from './handlers/key-context-activity.handler.js';

// Re-export commands
export { AnalyzeRelationshipsCommand } from './commands/analyze-relationships.command.js';
export type { AnalyzeRelationshipsResult } from './commands/analyze-relationships.command.js';
export { BulkUpdateKeyContextCommand } from './commands/bulk-update-key-context.command.js';
export type {
  BulkUpdateKeyContextResult,
  KeyContextInput,
} from './commands/bulk-update-key-context.command.js';

// Re-export queries
export { GetAIContextQuery } from './queries/get-ai-context.query.js';
export type { AIContextResult } from './queries/get-ai-context.query.js';
export { GetContextStatsQuery } from './queries/get-context-stats.query.js';
export type { ContextStatsResult } from './queries/get-context-stats.query.js';
export { GetRelatedKeysQuery } from './queries/get-related-keys.query.js';
export type { GetRelatedKeysResult } from './queries/get-related-keys.query.js';

// Handler registrations
const commandRegistrations = [
  defineCommandHandler(
    BulkUpdateKeyContextCommand,
    BulkUpdateKeyContextHandler,
    'keyContextBulkUpdateHandler'
  ),
  defineCommandHandler(
    AnalyzeRelationshipsCommand,
    AnalyzeRelationshipsHandler,
    'keyContextAnalyzeRelationshipsHandler'
  ),
];

const queryRegistrations = [
  defineQueryHandler(GetRelatedKeysQuery, GetRelatedKeysHandler, 'keyContextGetRelatedKeysHandler'),
  defineQueryHandler(GetAIContextQuery, GetAIContextHandler, 'keyContextGetAIContextHandler'),
  defineQueryHandler(
    GetContextStatsQuery,
    GetContextStatsHandler,
    'keyContextGetContextStatsHandler'
  ),
];

const eventRegistrations = [
  defineEventHandler(
    KeyContextUpdatedEvent,
    KeyContextActivityHandler,
    'keyContextActivityHandler'
  ),
  defineEventHandler(
    RelationshipsAnalyzedEvent,
    KeyContextActivityHandler,
    'keyContextActivityHandler'
  ),
];

/**
 * Register key context module handlers with the container.
 */
export function registerKeyContextModule(container: AwilixContainer<Cradle>): void {
  container.register({
    // Command handlers
    keyContextBulkUpdateHandler: asClass(BulkUpdateKeyContextHandler).singleton(),
    keyContextAnalyzeRelationshipsHandler: asClass(AnalyzeRelationshipsHandler).singleton(),

    // Query handlers
    keyContextGetRelatedKeysHandler: asClass(GetRelatedKeysHandler).singleton(),
    keyContextGetAIContextHandler: asClass(GetAIContextHandler).singleton(),
    keyContextGetContextStatsHandler: asClass(GetContextStatsHandler).singleton(),

    // Event handlers
    keyContextActivityHandler: asClass(KeyContextActivityHandler).singleton(),
  });

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
