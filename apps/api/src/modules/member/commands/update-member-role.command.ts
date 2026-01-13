import type { ProjectRole } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';
import type { ProjectMemberWithUser } from '../repositories/member.repository.js';

/**
 * Command to update a member's role in a project.
 *
 * Permission rules:
 * - OWNER can change any role (OWNER, MANAGER, DEVELOPER)
 * - MANAGER can only change to/from DEVELOPER role
 * - DEVELOPER cannot change roles
 *
 * Constraints:
 * - Cannot demote the last OWNER
 * - Sole OWNER cannot demote themselves
 */
export class UpdateMemberRoleCommand implements ICommand<ProjectMemberWithUser> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ProjectMemberWithUser;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** Target user's ID to update */
    public readonly targetUserId: string,
    /** New role to assign */
    public readonly newRole: ProjectRole,
    /** Actor (user making the change) ID */
    public readonly actorId: string
  ) {}
}
