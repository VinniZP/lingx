/**
 * DeviceTrustRevokedEvent
 *
 * Published when device trust is revoked for a session.
 */
import type { IEvent } from '../../../shared/cqrs/index.js';

export class DeviceTrustRevokedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly sessionId: string
  ) {
    this.occurredAt = new Date();
  }
}
