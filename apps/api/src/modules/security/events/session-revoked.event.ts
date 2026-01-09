import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a specific session is revoked.
 */
export class SessionRevokedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly revokedSessionId: string
  ) {
    this.occurredAt = new Date();
  }
}
