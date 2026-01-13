import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to remove a member from a project.
 *
 * Permission rules:
 * - Only OWNER can remove members
 *
 * Constraints:
 * - Cannot remove the last OWNER
 */
export class RemoveMemberCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** Target user's ID to remove */
    public readonly targetUserId: string,
    /** Actor (user making the removal) ID */
    public readonly actorId: string
  ) {}
}
