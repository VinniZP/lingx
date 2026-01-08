import type { FastifyBaseLogger } from 'fastify';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import type { AllSessionsRevokedEvent } from '../events/all-sessions-revoked.event.js';
import type { PasswordChangedEvent } from '../events/password-changed.event.js';
import type { SessionRevokedEvent } from '../events/session-revoked.event.js';

type SecurityEvent = PasswordChangedEvent | SessionRevokedEvent | AllSessionsRevokedEvent;

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
    // Log security events for audit trail
    // TODO: Implement persistent activity logging via ActivityService
    this.logger.info(
      {
        eventType: event.constructor.name,
        occurredAt: event.occurredAt,
        ...this.extractEventData(event),
      },
      `Security event: ${event.constructor.name}`
    );
  }

  /**
   * Extract relevant data from security events for logging.
   */
  private extractEventData(event: IEvent): Record<string, unknown> {
    // Type guard to extract event-specific data
    if ('userId' in event) {
      const data: Record<string, unknown> = { userId: event.userId };

      if ('newSessionId' in event) {
        data.newSessionId = event.newSessionId;
      }
      if ('revokedSessionId' in event) {
        data.revokedSessionId = event.revokedSessionId;
      }
      if ('revokedCount' in event) {
        data.revokedCount = event.revokedCount;
      }
      if ('currentSessionId' in event) {
        data.currentSessionId = event.currentSessionId;
      }

      return data;
    }

    return {};
  }
}
