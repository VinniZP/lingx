import type { QualityScore } from '@lingx/shared';
import { randomUUID } from 'node:crypto';
import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a translation quality has been evaluated.
 */
export class QualityEvaluatedEvent implements IEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly translationId: string,
    public readonly score: QualityScore,
    public readonly userId: string
  ) {}
}
