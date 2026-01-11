import type { FastifyBaseLogger } from 'fastify';
import type { IEventHandler } from '../../../shared/cqrs/index.js';
import type { ConfigDeletedEvent } from '../events/config-deleted.event.js';
import type { ConfigSavedEvent } from '../events/config-saved.event.js';
import type { ContextConfigUpdatedEvent } from '../events/context-config-updated.event.js';

/**
 * Event handler for AI translation activity logging.
 * Logs configuration changes for audit purposes.
 */
export class AIActivityHandler
  implements
    IEventHandler<ConfigSavedEvent>,
    IEventHandler<ConfigDeletedEvent>,
    IEventHandler<ContextConfigUpdatedEvent>
{
  constructor(private readonly logger: FastifyBaseLogger) {}

  async handle(
    event: ConfigSavedEvent | ConfigDeletedEvent | ContextConfigUpdatedEvent
  ): Promise<void> {
    // Log the event for audit purposes
    // In a production system, this could write to an audit log table
    // or emit to an external logging service

    if ('config' in event && 'provider' in event.config) {
      // ConfigSavedEvent
      this.logger.info(
        {
          type: 'config_saved',
          provider: event.config.provider,
          projectId: event.projectId,
          userId: event.userId,
          eventId: event.eventId,
        },
        '[AI Activity] Config saved'
      );
    } else if ('provider' in event) {
      // ConfigDeletedEvent
      this.logger.info(
        {
          type: 'config_deleted',
          provider: event.provider,
          projectId: event.projectId,
          userId: event.userId,
          eventId: event.eventId,
        },
        '[AI Activity] Config deleted'
      );
    } else {
      // ContextConfigUpdatedEvent
      this.logger.info(
        {
          type: 'context_config_updated',
          projectId: event.projectId,
          userId: event.userId,
          eventId: event.eventId,
        },
        '[AI Activity] Context config updated'
      );
    }
  }
}
