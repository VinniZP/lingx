import type { Space } from '@prisma/client';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a space is updated.
 */
export class SpaceUpdatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly space: Space,
    public readonly userId: string,
    public readonly changes: { name?: string; description?: string }
  ) {
    this.occurredAt = new Date();
  }
}
