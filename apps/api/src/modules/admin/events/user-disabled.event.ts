import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user is disabled by an admin.
 */
export class UserDisabledEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** ID of the user who was disabled */
    public readonly userId: string,
    /** ID of the admin who disabled the user */
    public readonly actorId: string,
    /** Whether activity was anonymized */
    public readonly anonymized: boolean
  ) {
    this.occurredAt = new Date();
  }
}
