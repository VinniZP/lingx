import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a glossary translation is deleted.
 */
export class GlossaryTranslationDeletedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly projectId: string,
    public readonly entryId: string,
    public readonly targetLanguage: string,
    public readonly userId: string
  ) {}
}
