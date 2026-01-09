/**
 * TotpEnabledEvent
 *
 * Published when a user successfully enables TOTP 2FA.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class TotpEnabledEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(public readonly userId: string) {
    this.occurredAt = new Date();
  }
}
