/**
 * DeviceTrustedEvent
 *
 * Published when a device/session is marked as trusted for 2FA bypass.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class DeviceTrustedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly sessionId: string
  ) {
    this.occurredAt = new Date();
  }
}
