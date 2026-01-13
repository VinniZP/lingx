import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to accept a project invitation.
 *
 * Validation:
 * - Token must exist and not be expired/accepted/revoked
 * - User's email must match invitation email (looked up from userId)
 */
export class AcceptInvitationCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Invitation token */
    public readonly token: string,
    /** User ID accepting the invitation */
    public readonly userId: string
  ) {}
}
