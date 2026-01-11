import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a space is deleted.
 */
export class SpaceDeletedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly spaceId: string,
    public readonly projectId: string,
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
