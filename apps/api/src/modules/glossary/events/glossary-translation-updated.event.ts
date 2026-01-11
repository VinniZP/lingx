import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a glossary translation is added or updated.
 */
export class GlossaryTranslationUpdatedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly projectId: string,
    public readonly entryId: string,
    public readonly targetLanguage: string,
    public readonly targetTerm: string,
    public readonly userId: string
  ) {}
}
