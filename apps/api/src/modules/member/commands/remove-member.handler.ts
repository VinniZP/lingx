import { BadRequestError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { MemberRemovedEvent } from '../events/member-removed.event.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { RemoveMemberCommand } from './remove-member.command.js';

/**
 * Handler for RemoveMemberCommand.
 * Removes a member from a project with permission and constraint validation.
 */
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RemoveMemberCommand): Promise<InferCommandResult<RemoveMemberCommand>> {
    const { projectId, targetUserId, actorId } = command;

    // 1. Verify actor is a member
    const actor = await this.memberRepository.findMemberByUserId(projectId, actorId);
    if (!actor) {
      throw new ForbiddenError('You are not a member of this project');
    }

    // 2. Only OWNER can remove members
    if (actor.role !== 'OWNER') {
      throw new ForbiddenError('Only owners can remove members');
    }

    // 3. Find target member
    const target = await this.memberRepository.findMemberByUserId(projectId, targetUserId);
    if (!target) {
      throw new ForbiddenError('Target user is not a member of this project');
    }

    // 4. Cannot remove last OWNER
    if (target.role === 'OWNER') {
      const ownerCount = await this.memberRepository.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot remove the last owner');
      }
    }

    // 5. Perform the removal
    await this.memberRepository.removeMember(projectId, targetUserId);

    // 6. Emit event
    await this.eventBus.publish(
      new MemberRemovedEvent(projectId, targetUserId, target.role, actorId)
    );
  }
}
