import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import type { ApiKeyCreatedEvent } from '../events/api-key-created.event.js';
import type { ApiKeyRevokedEvent } from '../events/api-key-revoked.event.js';
import type { UserLoggedInEvent } from '../events/user-logged-in.event.js';
import type { UserLoggedOutEvent } from '../events/user-logged-out.event.js';
import type { UserRegisteredEvent } from '../events/user-registered.event.js';

type AuthEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | ApiKeyCreatedEvent
  | ApiKeyRevokedEvent;

/**
 * Event handler for auth-related activity logging.
 *
 * This handler processes all auth events and can be extended to:
 * - Log activities to database
 * - Send notification emails
 * - Track security analytics
 */
export class AuthActivityHandler implements IEventHandler<AuthEvent> {
  async handle(_event: IEvent): Promise<void> {
    // TODO: Implement actual activity logging
    // For now, just acknowledge the event was received
    // In production, this would log to ActivityService or similar
    // Example of what activity logging could look like:
    // await this.activityService.log({
    //   type: event.constructor.name,
    //   data: event,
    //   occurredAt: event.occurredAt,
    // });
  }
}
