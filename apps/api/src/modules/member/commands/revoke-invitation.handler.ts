import { BadRequestError, ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { InvitationRepository } from '../repositories/invitation.repository.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { RevokeInvitationCommand } from './revoke-invitation.command.js';

/**
 * Handler for RevokeInvitationCommand.
 * Revokes a pending invitation.
 */
export class RevokeInvitationHandler implements ICommandHandler<RevokeInvitationCommand> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly invitationRepository: InvitationRepository
  ) {}

  async execute(
    command: RevokeInvitationCommand
  ): Promise<InferCommandResult<RevokeInvitationCommand>> {
    const { invitationId, projectId, actorId } = command;

    // 1. Verify actor is a member
    const actor = await this.memberRepository.findMemberByUserId(projectId, actorId);
    if (!actor) {
      throw new ForbiddenError('You are not a member of this project');
    }

    // 2. Only OWNER and MANAGER can revoke invitations
    if (actor.role === 'DEVELOPER') {
      throw new ForbiddenError('Only owners and managers can revoke invitations');
    }

    // 3. Find invitation
    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    // 4. Verify invitation belongs to this project
    if (invitation.project.id !== projectId) {
      throw new BadRequestError('Invitation does not belong to this project');
    }

    // 5. Check if already accepted
    if (invitation.acceptedAt) {
      throw new BadRequestError('Cannot revoke an already accepted invitation');
    }

    // 6. Check if already revoked
    if (invitation.revokedAt) {
      throw new BadRequestError('Invitation has already been revoked');
    }

    // 7. MANAGER can only revoke DEVELOPER invitations
    if (actor.role === 'MANAGER' && invitation.role !== 'DEVELOPER') {
      throw new ForbiddenError('Only owners can revoke manager invitations');
    }

    // 8. Revoke the invitation
    await this.invitationRepository.markRevoked(invitationId);
  }
}
