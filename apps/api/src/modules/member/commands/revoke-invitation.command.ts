import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to revoke a pending project invitation.
 *
 * Permission rules:
 * - MANAGER+ role required
 * - MANAGER can revoke ANY pending DEVELOPER invitation
 * - OWNER can revoke any invitation
 */
export class RevokeInvitationCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Invitation ID to revoke */
    public readonly invitationId: string,
    /** Project ID */
    public readonly projectId: string,
    /** User ID revoking the invitation */
    public readonly actorId: string
  ) {}
}
