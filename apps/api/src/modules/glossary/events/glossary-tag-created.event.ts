import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';
import type { GlossaryTag } from '../repositories/glossary.repository.js';

/**
 * Event emitted when a glossary tag is created.
 */
export class GlossaryTagCreatedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly projectId: string,
    public readonly tag: GlossaryTag,
    public readonly userId: string
  ) {}
}
