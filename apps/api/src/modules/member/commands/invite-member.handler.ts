import crypto from 'node:crypto';
import { BadRequestError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { MemberInvitedEvent } from '../events/member-invited.event.js';
import type { InvitationRepository } from '../repositories/invitation.repository.js';
import type { MemberRepository } from '../repositories/member.repository.js';
import type { InviteMemberCommand } from './invite-member.command.js';

/** Rate limit: 20 invitations per project per hour */
const PROJECT_RATE_LIMIT = 20;
const PROJECT_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Rate limit: 50 invitations per user per day */
const USER_RATE_LIMIT = 50;
const USER_RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Invitation expiry: 7 days */
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Handler for InviteMemberCommand.
 * Invites members to a project with rate limiting.
 */
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand> {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: InviteMemberCommand): Promise<InferCommandResult<InviteMemberCommand>> {
    const { projectId, emails, role, inviterId } = command;

    // 1. Validate non-empty email array
    if (emails.length === 0) {
      throw new BadRequestError('At least one email is required');
    }

    // 2. Verify inviter is a member
    const inviter = await this.memberRepository.findMemberByUserId(projectId, inviterId);
    if (!inviter) {
      throw new ForbiddenError('You are not a member of this project');
    }

    // 3. Verify inviter has permission to invite
    if (inviter.role === 'DEVELOPER') {
      throw new ForbiddenError('Only owners and managers can invite members');
    }

    // 4. MANAGER can only invite as DEVELOPER
    if (inviter.role === 'MANAGER' && role !== 'DEVELOPER') {
      throw new ForbiddenError('Managers can only invite as developer');
    }

    // 5. Check rate limits
    const now = new Date();
    const projectSince = new Date(now.getTime() - PROJECT_RATE_WINDOW_MS);
    const userSince = new Date(now.getTime() - USER_RATE_WINDOW_MS);

    const recentProjectInvites = await this.invitationRepository.countRecentByProject(
      projectId,
      projectSince
    );
    if (recentProjectInvites >= PROJECT_RATE_LIMIT) {
      throw new BadRequestError(
        `Project invitation rate limit exceeded (${PROJECT_RATE_LIMIT} per hour)`
      );
    }

    const recentUserInvites = await this.invitationRepository.countRecentByUser(
      inviterId,
      userSince
    );
    if (recentUserInvites >= USER_RATE_LIMIT) {
      throw new BadRequestError(`User invitation rate limit exceeded (${USER_RATE_LIMIT} per day)`);
    }

    // 6. Process each email with error handling for partial success
    const result = {
      sent: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (const email of emails) {
      try {
        // Check if user is already a member
        const existingUser = await this.memberRepository.findUserByEmail(email);
        if (existingUser) {
          const existingMembership = await this.memberRepository.findMemberByUserId(
            projectId,
            existingUser.id
          );
          if (existingMembership) {
            result.skipped.push(email);
            continue;
          }
        }

        // Check if pending invitation exists
        const pendingInvite = await this.invitationRepository.findPendingByEmail(projectId, email);
        if (pendingInvite) {
          result.skipped.push(email);
          continue;
        }

        // Create invitation
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_MS);

        const invitation = await this.invitationRepository.create({
          projectId,
          email,
          role,
          token,
          invitedById: inviterId,
          expiresAt,
        });

        result.sent.push(email);

        // Emit event (fire-and-forget, errors logged by EventBus)
        await this.eventBus.publish(new MemberInvitedEvent(invitation, inviterId));
      } catch (error) {
        // Log error but continue processing remaining emails
        // The error will be tracked in the result
        result.errors.push(email);
      }
    }

    return result;
  }
}
