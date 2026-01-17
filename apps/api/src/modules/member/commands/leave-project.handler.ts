import { BadRequestError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { MemberLeftEvent } from '../events/member-left.event.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { LeaveProjectCommand } from './leave-project.command.js';

/**
 * Handler for LeaveProjectCommand.
 * Removes the user from the project (voluntary leave).
 */
export class LeaveProjectHandler implements ICommandHandler<LeaveProjectCommand> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: LeaveProjectCommand): Promise<InferCommandResult<LeaveProjectCommand>> {
    const { projectId, userId } = command;

    // 1. Verify user is a member
    const member = await this.memberRepository.findMemberByUserId(projectId, userId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this project');
    }

    // 2. Sole OWNER cannot leave
    if (member.role === 'OWNER') {
      const ownerCount = await this.memberRepository.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot leave project as the sole owner');
      }
    }

    // 3. Perform the removal
    await this.memberRepository.removeMember(projectId, userId);

    // 4. Emit event
    await this.eventBus.publish(new MemberLeftEvent(projectId, userId, member.role));
  }
}
