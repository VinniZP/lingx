import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user changes their password.
 */
export class PasswordChangedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly newSessionId: string
  ) {
    this.occurredAt = new Date();
  }
}
