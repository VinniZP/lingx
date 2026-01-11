import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';
import type { ImportResult } from '../repositories/glossary.repository.js';

/**
 * Event emitted when glossary entries are imported.
 */
export class GlossaryImportedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly projectId: string,
    public readonly format: 'csv' | 'tbx',
    public readonly result: ImportResult,
    public readonly userId: string
  ) {}
}
