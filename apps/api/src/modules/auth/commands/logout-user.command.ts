import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to log out a user by deleting their session.
 */
export class LogoutUserCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Session ID to delete (may be undefined if no valid session) */
    public readonly sessionId?: string
  ) {}
}
