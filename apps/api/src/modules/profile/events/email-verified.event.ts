import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user's email change is verified.
 */
export class EmailVerifiedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User ID who verified the email */
    public readonly userId: string,
    /** Previous email address */
    public readonly previousEmail: string,
    /** New email address that is now active */
    public readonly newEmail: string
  ) {
    this.occurredAt = new Date();
  }
}
