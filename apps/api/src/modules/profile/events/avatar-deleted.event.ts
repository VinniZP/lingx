import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user's avatar is deleted.
 */
export class AvatarDeletedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User ID who deleted avatar */
    public readonly userId: string,
    /** Previous avatar URL that was deleted */
    public readonly previousAvatarUrl: string
  ) {
    this.occurredAt = new Date();
  }
}
