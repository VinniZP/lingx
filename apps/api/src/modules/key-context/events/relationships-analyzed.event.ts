import type { RelationshipType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when key relationships have been analyzed.
 */
export class RelationshipsAnalyzedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly branchId: string,
    public readonly jobId: string,
    public readonly types: RelationshipType[],
    public readonly userId: string
  ) {}
}
