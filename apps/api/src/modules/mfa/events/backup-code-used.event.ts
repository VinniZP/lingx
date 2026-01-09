/**
 * BackupCodeUsedEvent
 *
 * Published when a user uses a backup code for 2FA verification.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class BackupCodeUsedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly codesRemaining: number
  ) {
    this.occurredAt = new Date();
  }
}
