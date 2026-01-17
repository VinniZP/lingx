import { BadRequestError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { MemberRoleChangedEvent } from '../events/member-role-changed.event.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { UpdateMemberRoleCommand } from './update-member-role.command.js';

/**
 * Handler for UpdateMemberRoleCommand.
 * Updates a member's role with permission and constraint validation.
 */
export class UpdateMemberRoleHandler implements ICommandHandler<UpdateMemberRoleCommand> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: UpdateMemberRoleCommand
  ): Promise<InferCommandResult<UpdateMemberRoleCommand>> {
    const { projectId, targetUserId, newRole, actorId } = command;

    // 1. Verify actor is a member
    const actor = await this.memberRepository.findMemberByUserId(projectId, actorId);
    if (!actor) {
      throw new ForbiddenError('You are not a member of this project');
    }

    // 2. Verify actor has permission to change roles
    if (actor.role === 'DEVELOPER') {
      throw new ForbiddenError('Only owners and managers can change member roles');
    }

    // 3. Find target member
    const target = await this.memberRepository.findMemberByUserId(projectId, targetUserId);
    if (!target) {
      throw new ForbiddenError('Target user is not a member of this project');
    }

    // 4. Check if role is unchanged (no-op)
    if (target.role === newRole) {
      return target;
    }

    // 5. MANAGER permission restrictions
    if (actor.role === 'MANAGER') {
      // MANAGER can only change DEVELOPER role to DEVELOPER (effectively nothing useful)
      // They cannot promote to MANAGER or OWNER, and cannot demote from MANAGER/OWNER
      if (target.role !== 'DEVELOPER' || newRole !== 'DEVELOPER') {
        throw new ForbiddenError('Managers can only change developer roles');
      }
    }

    // 6. OWNER demotion constraints
    if (target.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await this.memberRepository.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot demote the last owner');
      }
    }

    // 7. Perform the update
    const oldRole = target.role;
    const updated = await this.memberRepository.updateMemberRole(projectId, targetUserId, newRole);

    // 8. Emit event
    await this.eventBus.publish(
      new MemberRoleChangedEvent(projectId, targetUserId, oldRole, newRole, actorId)
    );

    return updated;
  }
}
