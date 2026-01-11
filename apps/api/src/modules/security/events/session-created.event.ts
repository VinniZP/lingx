import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a new session is created (login, 2FA, etc).
 */
export class SessionCreatedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly deviceInfo: string | null,
    public readonly ipAddress: string | null
  ) {
    this.occurredAt = new Date();
  }
}
