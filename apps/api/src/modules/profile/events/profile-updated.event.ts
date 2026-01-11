import type { IEvent } from '../../../shared/cqrs/index.js';
import type { UserProfile } from '../types.js';

/**
 * Event emitted when a user's profile is updated.
 */
export class ProfileUpdatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The updated user profile */
    public readonly profile: UserProfile,
    /** User ID who made the change */
    public readonly userId: string,
    /** What fields were changed */
    public readonly changes: { name?: boolean }
  ) {
    this.occurredAt = new Date();
  }
}
