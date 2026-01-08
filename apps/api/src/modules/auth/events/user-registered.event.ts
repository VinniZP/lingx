import type { IEvent } from '../../../shared/cqrs/index.js';
import type { UserWithoutPassword } from '../commands/register-user.command.js';

/**
 * Event emitted when a new user is registered.
 *
 * Side effects can include:
 * - Sending welcome email
 * - Recording activity log
 * - Analytics tracking
 */
export class UserRegisteredEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The newly registered user (without password) */
    public readonly user: UserWithoutPassword
  ) {
    this.occurredAt = new Date();
  }
}
