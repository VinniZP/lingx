/**
 * Member Email Handler
 *
 * Handles member-related events and queues appropriate email notifications.
 * Follows the same pattern as MemberActivityHandler.
 */
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { IEventHandler } from '../../../shared/cqrs/index.js';
import { InvitationAcceptedEvent } from '../../member/events/invitation-accepted.event.js';
import { MemberInvitedEvent } from '../../member/events/member-invited.event.js';
import { MemberLeftEvent } from '../../member/events/member-left.event.js';
import { MemberRemovedEvent } from '../../member/events/member-removed.event.js';
import { MemberRoleChangedEvent } from '../../member/events/member-role-changed.event.js';
import { OwnershipTransferredEvent } from '../../member/events/ownership-transferred.event.js';
import type { EmailService } from '../email.service.js';
import {
  InvitationAcceptedEmail,
  InvitationEmail,
  MemberLeftEmail,
  MemberRemovedEmail,
  OwnershipTransferredEmail,
  RoleChangedEmail,
} from '../templates/index.js';

type MemberEmailEvent =
  | MemberInvitedEvent
  | InvitationAcceptedEvent
  | MemberRemovedEvent
  | MemberRoleChangedEvent
  | OwnershipTransferredEvent
  | MemberLeftEvent;

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  slug: string;
}

export class MemberEmailHandler implements IEventHandler<MemberEmailEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: MemberEmailEvent): Promise<void> {
    try {
      if (event instanceof MemberInvitedEvent) {
        await this.handleMemberInvited(event);
      } else if (event instanceof InvitationAcceptedEvent) {
        await this.handleInvitationAccepted(event);
      } else if (event instanceof MemberRemovedEvent) {
        await this.handleMemberRemoved(event);
      } else if (event instanceof MemberRoleChangedEvent) {
        await this.handleRoleChanged(event);
      } else if (event instanceof OwnershipTransferredEvent) {
        await this.handleOwnershipTransferred(event);
      } else if (event instanceof MemberLeftEvent) {
        await this.handleMemberLeft(event);
      }
    } catch (error) {
      this.logger.error(
        { error, eventType: event.constructor.name },
        'Failed to handle member email event'
      );
    }
  }

  /**
   * Send invitation email to the invited user.
   */
  private async handleMemberInvited(event: MemberInvitedEvent): Promise<void> {
    const { invitation } = event;

    await this.emailService.queueEmail(
      invitation.email,
      `You've been invited to join ${invitation.project.name}`,
      InvitationEmail({
        inviteeEmail: invitation.email,
        projectName: invitation.project.name,
        projectSlug: invitation.project.slug,
        role: invitation.role,
        inviterName: invitation.invitedBy.name || '',
        inviterEmail: invitation.invitedBy.email,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        appUrl: this.emailService.appBaseUrl,
      })
    );
  }

  /**
   * Notify the inviter when someone accepts their invitation.
   */
  private async handleInvitationAccepted(event: InvitationAcceptedEvent): Promise<void> {
    const { invitation, userId } = event;

    // Get the user who accepted
    const acceptedUser = await this.findUserById(userId);
    if (!acceptedUser) {
      this.logger.warn({ userId }, 'Could not find user who accepted invitation');
      return;
    }

    await this.emailService.queueEmail(
      invitation.invitedBy.email,
      `${acceptedUser.name || acceptedUser.email} joined ${invitation.project.name}`,
      InvitationAcceptedEmail({
        inviterName: invitation.invitedBy.name || '',
        newMemberName: acceptedUser.name || '',
        newMemberEmail: acceptedUser.email,
        projectName: invitation.project.name,
        projectSlug: invitation.project.slug,
        role: invitation.role,
        appUrl: this.emailService.appBaseUrl,
      })
    );
  }

  /**
   * Notify the member when they are removed from a project.
   */
  private async handleMemberRemoved(event: MemberRemovedEvent): Promise<void> {
    const { projectId, userId, actorId } = event;

    // Get user and project details
    const [removedUser, actor, project] = await Promise.all([
      this.findUserById(userId),
      this.findUserById(actorId),
      this.findProjectById(projectId),
    ]);

    if (!removedUser || !project) {
      this.logger.warn(
        { userId, projectId },
        'Could not find user or project for member removed email'
      );
      return;
    }

    await this.emailService.queueEmail(
      removedUser.email,
      `You've been removed from ${project.name}`,
      MemberRemovedEmail({
        memberName: removedUser.name || '',
        memberEmail: removedUser.email,
        projectName: project.name,
        removerName: actor?.name || '',
        removerEmail: actor?.email || '',
      })
    );
  }

  /**
   * Notify the member when their role changes.
   */
  private async handleRoleChanged(event: MemberRoleChangedEvent): Promise<void> {
    const { projectId, userId, oldRole, newRole, actorId } = event;

    // Get user, actor, and project details
    const [member, actor, project] = await Promise.all([
      this.findUserById(userId),
      this.findUserById(actorId),
      this.findProjectById(projectId),
    ]);

    if (!member || !project) {
      this.logger.warn(
        { userId, projectId },
        'Could not find user or project for role changed email'
      );
      return;
    }

    await this.emailService.queueEmail(
      member.email,
      `Your role in ${project.name} has changed`,
      RoleChangedEmail({
        memberName: member.name || '',
        memberEmail: member.email,
        projectName: project.name,
        projectSlug: project.slug,
        oldRole,
        newRole,
        changerName: actor?.name || '',
        changerEmail: actor?.email || '',
        appUrl: this.emailService.appBaseUrl,
      })
    );
  }

  /**
   * Notify both parties when ownership is transferred.
   */
  private async handleOwnershipTransferred(event: OwnershipTransferredEvent): Promise<void> {
    const { projectId, newOwnerId, previousOwnerId } = event;

    // Get both users and project
    const [newOwner, previousOwner, project] = await Promise.all([
      this.findUserById(newOwnerId),
      this.findUserById(previousOwnerId),
      this.findProjectById(projectId),
    ]);

    if (!newOwner || !previousOwner || !project) {
      this.logger.warn(
        { newOwnerId, previousOwnerId, projectId },
        'Could not find users or project for ownership transfer email'
      );
      return;
    }

    // Email to new owner
    await this.emailService.queueEmail(
      newOwner.email,
      `Ownership of ${project.name} transferred to you`,
      OwnershipTransferredEmail({
        recipientName: newOwner.name || '',
        recipientEmail: newOwner.email,
        projectName: project.name,
        projectSlug: project.slug,
        newOwnerName: newOwner.name || '',
        newOwnerEmail: newOwner.email,
        previousOwnerName: previousOwner.name || '',
        previousOwnerEmail: previousOwner.email,
        isNewOwner: true,
        appUrl: this.emailService.appBaseUrl,
      })
    );

    // Email to previous owner
    await this.emailService.queueEmail(
      previousOwner.email,
      `Ownership of ${project.name} transferred`,
      OwnershipTransferredEmail({
        recipientName: previousOwner.name || '',
        recipientEmail: previousOwner.email,
        projectName: project.name,
        projectSlug: project.slug,
        newOwnerName: newOwner.name || '',
        newOwnerEmail: newOwner.email,
        previousOwnerName: previousOwner.name || '',
        previousOwnerEmail: previousOwner.email,
        isNewOwner: false,
        appUrl: this.emailService.appBaseUrl,
      })
    );
  }

  /**
   * Notify project owners when a member leaves.
   */
  private async handleMemberLeft(event: MemberLeftEvent): Promise<void> {
    const { projectId, userId, role } = event;

    // Get the user who left and project details
    const [leftUser, project] = await Promise.all([
      this.findUserById(userId),
      this.findProjectById(projectId),
    ]);

    if (!leftUser || !project) {
      this.logger.warn(
        { userId, projectId },
        'Could not find user or project for member left email'
      );
      return;
    }

    // Find all project owners to notify
    const owners = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        role: 'OWNER',
        userId: { not: userId }, // Don't notify the person who left
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send email to each owner
    for (const owner of owners) {
      await this.emailService.queueEmail(
        owner.user.email,
        `${leftUser.name || leftUser.email} left ${project.name}`,
        MemberLeftEmail({
          ownerName: owner.user.name || '',
          ownerEmail: owner.user.email,
          memberName: leftUser.name || '',
          memberEmail: leftUser.email,
          projectName: project.name,
          projectSlug: project.slug,
          memberRole: role,
          appUrl: this.emailService.appBaseUrl,
        })
      );
    }
  }

  /**
   * Find user by ID with basic info for emails.
   */
  private async findUserById(userId: string): Promise<UserInfo | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  }

  /**
   * Find project by ID with basic info for emails.
   */
  private async findProjectById(projectId: string): Promise<ProjectInfo | null> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, slug: true },
    });
  }
}
