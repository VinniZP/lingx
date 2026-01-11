import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user's avatar is updated.
 */
export class AvatarUpdatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** User ID who updated avatar */
    public readonly userId: string,
    /** New avatar URL */
    public readonly avatarUrl: string,
    /** Previous avatar URL (if any) */
    public readonly previousAvatarUrl: string | null
  ) {
    this.occurredAt = new Date();
  }
}
