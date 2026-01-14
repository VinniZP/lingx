import type { PrismaClient } from '@prisma/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { InvitationAcceptedEvent } from '../events/invitation-accepted.event.js';
import type { InvitationRepository } from '../repositories/invitation.repository.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { AcceptInvitationCommand } from './accept-invitation.command.js';

/**
 * Handler for AcceptInvitationCommand.
 * Accepts an invitation and creates a project membership.
 *
 * Uses a transaction to ensure atomicity of:
 * - Adding member to project
 * - Marking invitation as accepted
 *
 * NOTE: This handler directly uses Prisma for the transaction, which is an
 * exception to the CQRS rule "handlers never call Prisma directly". This is
 * necessary because transactions require a shared transaction client (tx)
 * that must be passed to all operations within the transaction scope.
 * Repositories cannot manage cross-repository transactions internally.
 */
export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly eventBus: IEventBus,
    private readonly prisma: PrismaClient
  ) {}

  async execute(
    command: AcceptInvitationCommand
  ): Promise<InferCommandResult<AcceptInvitationCommand>> {
    const { token, userId } = command;

    // 1. Look up the user to get their email
    const user = await this.memberRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // 2. Find invitation by token
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    // 3. Check if invitation is already accepted
    if (invitation.acceptedAt) {
      throw new BadRequestError('This invitation has already been accepted');
    }

    // 4. Check if invitation is revoked
    if (invitation.revokedAt) {
      throw new BadRequestError('This invitation has been revoked');
    }

    // 5. Check if invitation is expired
    const now = new Date();
    if (invitation.expiresAt < now) {
      throw new BadRequestError('This invitation has expired');
    }

    // 6. Verify user email matches invitation email (case-insensitive)
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError('This invitation is not for your email');
    }

    // 7. Check if user is already a member (prevents duplicate membership)
    const existingMembership = await this.memberRepository.findMemberByUserId(
      invitation.project.id,
      userId
    );
    if (existingMembership) {
      throw new BadRequestError('You are already a member of this project');
    }

    // 8. Create membership and mark invitation accepted atomically
    await this.prisma.$transaction(async (tx) => {
      // Create project membership
      await tx.projectMember.create({
        data: {
          projectId: invitation.project.id,
          userId,
          role: invitation.role,
        },
      });

      // Mark invitation as accepted
      await tx.projectInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    });

    // 9. Emit event (outside transaction - fire-and-forget)
    await this.eventBus.publish(new InvitationAcceptedEvent(invitation, userId));
  }
}
