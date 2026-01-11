import type { FastifyBaseLogger } from 'fastify';
import type { IEventHandler } from '../../../shared/cqrs/index.js';
import type { KeyContextUpdatedEvent } from '../events/key-context-updated.event.js';
import type { RelationshipsAnalyzedEvent } from '../events/relationships-analyzed.event.js';

/**
 * Event handler for key context activity logging.
 * Logs key context events for audit purposes.
 */
export class KeyContextActivityHandler
  implements IEventHandler<KeyContextUpdatedEvent>, IEventHandler<RelationshipsAnalyzedEvent>
{
  constructor(private readonly logger: FastifyBaseLogger) {}

  async handle(event: KeyContextUpdatedEvent | RelationshipsAnalyzedEvent): Promise<void> {
    if ('updated' in event) {
      // KeyContextUpdatedEvent
      this.logger.info(
        {
          type: 'key_context_updated',
          branchId: event.branchId,
          updated: event.updated,
          notFound: event.notFound,
          userId: event.userId,
        },
        '[Key Context Activity] Key context updated'
      );
    } else {
      // RelationshipsAnalyzedEvent
      this.logger.info(
        {
          type: 'relationships_analyzed',
          branchId: event.branchId,
          jobId: event.jobId,
          types: event.types,
          userId: event.userId,
        },
        '[Key Context Activity] Relationships analyzed'
      );
    }
  }
}
