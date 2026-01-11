import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user initiates an email change.
 */
export class EmailChangeInitiatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User ID who initiated the change */
    public readonly userId: string,
    /** Current email address */
    public readonly currentEmail: string,
    /** New email address being verified */
    public readonly newEmail: string
  ) {
    this.occurredAt = new Date();
  }
}
