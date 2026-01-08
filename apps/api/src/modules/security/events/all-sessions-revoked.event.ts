import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when all sessions (except current) are revoked.
 */
export class AllSessionsRevokedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly revokedCount: number,
    public readonly currentSessionId: string
  ) {
    this.occurredAt = new Date();
  }
}
