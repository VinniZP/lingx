/**
 * Profile Activity Event Handler
 *
 * Handles activity logging for profile events.
 * This is a side effect triggered by domain events.
 *
 * NOTE: Activity logging failures are caught and logged but do not propagate.
 * This ensures primary operations succeed even if activity logging fails.
 *
 * This single handler class is used for all profile events since they all
 * log user activity in a similar way.
 */

import type { FastifyBaseLogger } from 'fastify';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';

/**
 * Generic profile activity handler that logs events.
 *
 * Profile events don't have a projectId, so we just log the event
 * for now. In the future, we could store user activity separately.
 */
export class ProfileActivityHandler implements IEventHandler<IEvent> {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async handle(event: IEvent): Promise<void> {
    try {
      // For now, just log the event. Profile events don't have a project context
      // so we can't use the activity service which requires projectId.
      this.logger.info(
        {
          eventName: event.constructor.name,
          occurredAt: event.occurredAt,
        },
        'Profile event occurred'
      );
    } catch (error) {
      this.logger.error(
        { error, eventName: event.constructor.name },
        'Failed to log profile activity'
      );
    }
  }
}
