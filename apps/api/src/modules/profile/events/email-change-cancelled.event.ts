import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user cancels a pending email change.
 */
export class EmailChangeCancelledEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User ID who cancelled the email change */
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
