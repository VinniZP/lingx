import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a session is deleted (logout).
 * Includes userId for audit trail consistency with other session events.
 */
export class SessionDeletedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly sessionId: string,
    public readonly userId: string
  ) {
    this.occurredAt = new Date();
  }
}
