/**
 * TotpDisabledEvent
 *
 * Published when a user disables TOTP 2FA.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class TotpDisabledEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(public readonly userId: string) {
    this.occurredAt = new Date();
  }
}
