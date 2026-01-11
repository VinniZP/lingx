import type { FastifyBaseLogger } from 'fastify';
import type { IEventHandler } from '../../../shared/cqrs/index.js';
import type { BatchEvaluationQueuedEvent } from '../events/batch-evaluation-queued.event.js';
import type { QualityConfigUpdatedEvent } from '../events/quality-config-updated.event.js';
import type { QualityEvaluatedEvent } from '../events/quality-evaluated.event.js';

/**
 * Event handler for quality estimation activity logging.
 * Logs quality events for audit purposes.
 */
export class QualityActivityHandler
  implements
    IEventHandler<QualityEvaluatedEvent>,
    IEventHandler<BatchEvaluationQueuedEvent>,
    IEventHandler<QualityConfigUpdatedEvent>
{
  constructor(private readonly logger: FastifyBaseLogger) {}

  async handle(
    event: QualityEvaluatedEvent | BatchEvaluationQueuedEvent | QualityConfigUpdatedEvent
  ): Promise<void> {
    if ('score' in event) {
      // QualityEvaluatedEvent
      this.logger.info(
        {
          type: 'quality_evaluated',
          translationId: event.translationId,
          score: event.score.score,
          evaluationType: event.score.evaluationType,
          userId: event.userId,
        },
        '[Quality Activity] Translation evaluated'
      );
    } else if ('stats' in event) {
      // BatchEvaluationQueuedEvent
      this.logger.info(
        {
          type: 'batch_evaluation_queued',
          branchId: event.branchId,
          jobId: event.jobId,
          stats: event.stats,
          userId: event.userId,
        },
        '[Quality Activity] Batch evaluation queued'
      );
    } else {
      // QualityConfigUpdatedEvent
      this.logger.info(
        {
          type: 'quality_config_updated',
          projectId: event.projectId,
          aiEnabled: event.config.aiEvaluationEnabled,
          userId: event.userId,
        },
        '[Quality Activity] Quality config updated'
      );
    }
  }
}
