import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';
import type { GlossaryEntryWithRelations } from '../repositories/glossary.repository.js';

/**
 * Event emitted when a glossary entry is updated.
 */
export class GlossaryEntryUpdatedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly entry: GlossaryEntryWithRelations,
    public readonly userId: string
  ) {}
}
