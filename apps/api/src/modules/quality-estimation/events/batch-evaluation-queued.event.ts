import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a batch quality evaluation has been queued.
 */
export class BatchEvaluationQueuedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly branchId: string,
    public readonly jobId: string,
    public readonly stats: {
      total: number;
      cached: number;
      queued: number;
    },
    public readonly userId: string
  ) {}
}
