import type { Space } from '@prisma/client';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a space is created.
 */
export class SpaceCreatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly space: Space,
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
