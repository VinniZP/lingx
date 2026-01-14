import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when an admin impersonates a user.
 * Used for audit trail.
 */
export class UserImpersonatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the user being impersonated */
    public readonly targetUserId: string,
    /** ID of the admin performing the impersonation */
    public readonly actorId: string,
    /** When the impersonation token expires */
    public readonly tokenExpiry: Date
  ) {
    this.occurredAt = new Date();
  }
}
