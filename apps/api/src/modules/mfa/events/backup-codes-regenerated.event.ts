/**
 * BackupCodesRegeneratedEvent
 *
 * Published when a user regenerates their backup codes.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class BackupCodesRegeneratedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(public readonly userId: string) {
    this.occurredAt = new Date();
  }
}
