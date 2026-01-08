import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user logs out.
 */
export class UserLoggedOutEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** Session ID that was logged out (may be undefined) */
    public readonly sessionId?: string
  ) {
    this.occurredAt = new Date();
  }
}
