import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a glossary tag is deleted.
 */
export class GlossaryTagDeletedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly projectId: string,
    public readonly tagId: string,
    public readonly userId: string
  ) {}
}
