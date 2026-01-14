import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user is enabled by an admin.
 */
export class UserEnabledEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the user who was enabled */
    public readonly userId: string,
    /** ID of the admin who enabled the user */
    public readonly actorId: string
  ) {
    this.occurredAt = new Date();
  }
}
