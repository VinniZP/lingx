/**
 * WentPasswordlessEvent
 *
 * Published when a user removes their password and goes fully passwordless.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class WentPasswordlessEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(public readonly userId: string) {
    this.occurredAt = new Date();
  }
}
