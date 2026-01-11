import type { FastifyBaseLogger } from 'fastify';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import type { AllSessionsRevokedEvent } from '../events/all-sessions-revoked.event.js';
import type { PasswordChangedEvent } from '../events/password-changed.event.js';
import type { SessionCreatedEvent } from '../events/session-created.event.js';
import type { SessionDeletedEvent } from '../events/session-deleted.event.js';
import type { SessionRevokedEvent } from '../events/session-revoked.event.js';

type SecurityEvent =
  | PasswordChangedEvent
  | SessionRevokedEvent
  | AllSessionsRevokedEvent
  | SessionCreatedEvent
  | SessionDeletedEvent;

/** Fields to extract from security events for logging */
const EVENT_FIELDS = [
  'userId',
  'sessionId',
  'newSessionId',
  'revokedSessionId',
  'revokedCount',
  'currentSessionId',
  'deviceInfo',
  'ipAddress',
] as const;

/**
 * Event handler for security-related activity logging.
 *
 * This handler processes all security events and logs them for audit purposes.
 * Can be extended to:
 * - Log activities to database (ActivityService)
 * - Send notification emails
 * - Track security analytics
 */
export class SecurityActivityHandler implements IEventHandler<SecurityEvent> {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async handle(event: IEvent): Promise<void> {
    const eventData = this.extractEventData(event);

    this.logger.info(
      {
        eventType: event.constructor.name,
        occurredAt: event.occurredAt,
        ...eventData,
      },
      `Security event: ${event.constructor.name}`
    );
  }

  /**
   * Extract relevant data from security events for logging.
   */
  private extractEventData(event: IEvent): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const eventRecord = event as unknown as Record<string, unknown>;

    for (const field of EVENT_FIELDS) {
      if (field in event) {
        data[field] = eventRecord[field];
      }
    }

    return data;
  }
}
