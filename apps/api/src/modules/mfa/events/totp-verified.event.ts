/**
 * TotpVerifiedEvent
 *
 * Published when a user successfully verifies their TOTP code during login.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class TotpVerifiedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly sessionId?: string
  ) {
    this.occurredAt = new Date();
  }
}
