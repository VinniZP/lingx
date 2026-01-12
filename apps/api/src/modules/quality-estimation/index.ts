/**
 * Quality Estimation Module
 *
 * CQRS-lite module for quality estimation operations.
 * Provides commands, queries, and events for translation quality scoring.
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
import { EvaluateQualityCommand } from './commands/evaluate-quality.command.js';
import { EvaluateQualityHandler } from './commands/evaluate-quality.handler.js';
import { QueueBatchEvaluationCommand } from './commands/queue-batch-evaluation.command.js';
import { QueueBatchEvaluationHandler } from './commands/queue-batch-evaluation.handler.js';
import { UpdateQualityConfigCommand } from './commands/update-quality-config.command.js';
import { UpdateQualityConfigHandler } from './commands/update-quality-config.handler.js';

// Queries
import { GetBranchSummaryHandler } from './queries/get-branch-summary.handler.js';
import { GetBranchSummaryQuery } from './queries/get-branch-summary.query.js';
import { GetCachedScoreHandler } from './queries/get-cached-score.handler.js';
import { GetCachedScoreQuery } from './queries/get-cached-score.query.js';
import { GetKeyIssuesHandler } from './queries/get-key-issues.handler.js';
import { GetKeyIssuesQuery } from './queries/get-key-issues.query.js';
import { GetQualityConfigHandler } from './queries/get-quality-config.handler.js';
import { GetQualityConfigQuery } from './queries/get-quality-config.query.js';
import { ValidateICUHandler } from './queries/validate-icu.handler.js';
import { ValidateICUQuery } from './queries/validate-icu.query.js';

// Events
import { BatchEvaluationQueuedEvent } from './events/batch-evaluation-queued.event.js';
import { QualityConfigUpdatedEvent } from './events/quality-config-updated.event.js';
import { QualityEvaluatedEvent } from './events/quality-evaluated.event.js';

// Event handlers
import { QualityActivityHandler } from './handlers/quality-activity.handler.js';

// Re-export commands and types
export { EvaluateQualityCommand } from './commands/evaluate-quality.command.js';
export {
  QueueBatchEvaluationCommand,
  type BatchEvaluationOptions,
  type BatchEvaluationResult,
} from './commands/queue-batch-evaluation.command.js';
export { UpdateQualityConfigCommand } from './commands/update-quality-config.command.js';

// Re-export queries
export { GetBranchSummaryQuery } from './queries/get-branch-summary.query.js';
export { GetCachedScoreQuery } from './queries/get-cached-score.query.js';
export { GetKeyIssuesQuery, type GetKeyIssuesResult } from './queries/get-key-issues.query.js';
export { GetQualityConfigQuery } from './queries/get-quality-config.query.js';
export { ValidateICUQuery, type ValidateICUResult } from './queries/validate-icu.query.js';

// Handler registrations
const queryRegistrations = [
  defineQueryHandler(GetCachedScoreQuery, GetCachedScoreHandler, 'qualityGetCachedScoreHandler'),
  defineQueryHandler(
    GetBranchSummaryQuery,
    GetBranchSummaryHandler,
    'qualityGetBranchSummaryHandler'
  ),
  defineQueryHandler(GetQualityConfigQuery, GetQualityConfigHandler, 'qualityGetConfigHandler'),
  defineQueryHandler(GetKeyIssuesQuery, GetKeyIssuesHandler, 'qualityGetKeyIssuesHandler'),
  defineQueryHandler(ValidateICUQuery, ValidateICUHandler, 'qualityValidateICUHandler'),
];

const commandRegistrations = [
  defineCommandHandler(EvaluateQualityCommand, EvaluateQualityHandler, 'qualityEvaluateHandler'),
  defineCommandHandler(
    QueueBatchEvaluationCommand,
    QueueBatchEvaluationHandler,
    'qualityQueueBatchHandler'
  ),
  defineCommandHandler(
    UpdateQualityConfigCommand,
    UpdateQualityConfigHandler,
    'qualityUpdateConfigHandler'
  ),
];

const eventRegistrations = [
  defineEventHandler(QualityEvaluatedEvent, QualityActivityHandler, 'qualityActivityHandler'),
  defineEventHandler(BatchEvaluationQueuedEvent, QualityActivityHandler, 'qualityActivityHandler'),
  defineEventHandler(QualityConfigUpdatedEvent, QualityActivityHandler, 'qualityActivityHandler'),
];

/**
 * Register quality estimation module handlers with the container.
 */
export function registerQualityEstimationModule(container: AwilixContainer<Cradle>): void {
  container.register({
    // Query handlers
    qualityGetCachedScoreHandler: asClass(GetCachedScoreHandler).singleton(),
    qualityGetBranchSummaryHandler: asClass(GetBranchSummaryHandler).singleton(),
    qualityGetConfigHandler: asClass(GetQualityConfigHandler).singleton(),
    qualityGetKeyIssuesHandler: asClass(GetKeyIssuesHandler).singleton(),
    qualityValidateICUHandler: asClass(ValidateICUHandler).singleton(),

    // Command handlers
    qualityEvaluateHandler: asClass(EvaluateQualityHandler).singleton(),
    qualityQueueBatchHandler: asClass(QueueBatchEvaluationHandler).singleton(),
    qualityUpdateConfigHandler: asClass(UpdateQualityConfigHandler).singleton(),

    // Event handlers
    qualityActivityHandler: asClass(QualityActivityHandler).singleton(),
  });

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
