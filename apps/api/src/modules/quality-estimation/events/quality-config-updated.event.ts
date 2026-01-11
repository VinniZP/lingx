import type { QualityScoringConfig } from '@lingx/shared';
import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when quality scoring configuration has been updated.
 */
export class QualityConfigUpdatedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly projectId: string,
    public readonly config: QualityScoringConfig,
    public readonly userId: string
  ) {}
}
