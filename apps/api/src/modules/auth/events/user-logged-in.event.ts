import type { IEvent } from '../../../shared/cqrs/index.js';

/**
 * Event emitted when a user successfully logs in.
 *
 * Side effects can include:
 * - Recording activity log
 * - Sending login notification email
 * - Detecting suspicious login patterns
 */
export class UserLoggedInEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The user's ID */
    public readonly userId: string,
    /** The new session's ID */
    public readonly sessionId: string
  ) {
    this.occurredAt = new Date();
  }
}
