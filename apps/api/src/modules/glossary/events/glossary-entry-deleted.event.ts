import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a glossary entry is deleted.
 */
export class GlossaryEntryDeletedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly projectId: string,
    public readonly entryId: string,
    public readonly userId: string
  ) {}
}
