import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when key context metadata has been bulk updated.
 */
export class KeyContextUpdatedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly branchId: string,
    public readonly updated: number,
    public readonly notFound: number,
    public readonly userId: string
  ) {}
}
