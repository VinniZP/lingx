import type { FastifyBaseLogger } from 'fastify';
import type { ActivityService } from '../../../services/activity.service.js';
import type { IEventHandler } from '../../../shared/cqrs/index.js';
import { InvitationAcceptedEvent } from '../events/invitation-accepted.event.js';
import { MemberInvitedEvent } from '../events/member-invited.event.js';
import { MemberLeftEvent } from '../events/member-left.event.js';
import { MemberRemovedEvent } from '../events/member-removed.event.js';
import { MemberRoleChangedEvent } from '../events/member-role-changed.event.js';
import { OwnershipTransferredEvent } from '../events/ownership-transferred.event.js';

type MemberEvent =
  | MemberRoleChangedEvent
  | MemberRemovedEvent
  | MemberLeftEvent
  | OwnershipTransferredEvent
  | MemberInvitedEvent
  | InvitationAcceptedEvent;

/**
 * Event handler for member-related activity logging.
 *
 * Handles:
 * - MemberRoleChangedEvent -> logs "member_role_change" activity
 * - MemberRemovedEvent -> logs "member_remove" activity
 * - MemberLeftEvent -> logs "member_leave" activity
 * - OwnershipTransferredEvent -> logs "ownership_transfer" activity
 * - MemberInvitedEvent -> logs "member_invite" activity
 * - InvitationAcceptedEvent -> logs "invitation_accept" activity
 *
 * NOTE: Activity logging failures are caught and logged but do not propagate.
 * This ensures primary operations succeed even if activity logging fails.
 */
export class MemberActivityHandler implements IEventHandler<MemberEvent> {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: MemberEvent): Promise<void> {
    if (event instanceof MemberRoleChangedEvent) {
      await this.handleMemberRoleChanged(event);
    } else if (event instanceof MemberRemovedEvent) {
      await this.handleMemberRemoved(event);
    } else if (event instanceof MemberLeftEvent) {
      await this.handleMemberLeft(event);
    } else if (event instanceof OwnershipTransferredEvent) {
      await this.handleOwnershipTransferred(event);
    } else if (event instanceof MemberInvitedEvent) {
      await this.handleMemberInvited(event);
    } else {
      // TypeScript narrows to InvitationAcceptedEvent here
      await this.handleInvitationAccepted(event);
    }
  }

  private async handleMemberRoleChanged(event: MemberRoleChangedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'member_role_change',
        projectId: event.projectId,
        userId: event.actorId,
        metadata: {
          targetUserId: event.userId,
          oldRole: event.oldRole,
          newRole: event.newRole,
        },
        changes: [
          {
            entityType: 'member',
            entityId: event.userId,
            keyName: 'role',
            oldValue: event.oldRole,
            newValue: event.newRole,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'MemberRoleChangedEvent', projectId: event.projectId },
        'Failed to log member role change activity'
      );
    }
  }

  private async handleMemberRemoved(event: MemberRemovedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'member_remove',
        projectId: event.projectId,
        userId: event.actorId,
        metadata: {
          targetUserId: event.userId,
          role: event.role,
        },
        changes: [
          {
            entityType: 'member',
            entityId: event.userId,
            oldValue: event.role,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'MemberRemovedEvent', projectId: event.projectId },
        'Failed to log member removal activity'
      );
    }
  }

  private async handleMemberLeft(event: MemberLeftEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'member_leave',
        projectId: event.projectId,
        userId: event.userId,
        metadata: {
          role: event.role,
        },
        changes: [
          {
            entityType: 'member',
            entityId: event.userId,
            oldValue: event.role,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'MemberLeftEvent', projectId: event.projectId },
        'Failed to log member leave activity'
      );
    }
  }

  private async handleOwnershipTransferred(event: OwnershipTransferredEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'ownership_transfer',
        projectId: event.projectId,
        userId: event.previousOwnerId,
        metadata: {
          newOwnerId: event.newOwnerId,
          previousOwnerKeptOwnership: event.previousOwnerKeptOwnership,
        },
        changes: [
          {
            entityType: 'member',
            entityId: event.newOwnerId,
            keyName: 'role',
            newValue: 'OWNER',
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'OwnershipTransferredEvent', projectId: event.projectId },
        'Failed to log ownership transfer activity'
      );
    }
  }

  private async handleMemberInvited(event: MemberInvitedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'member_invite',
        projectId: event.invitation.project.id,
        userId: event.inviterId,
        metadata: {
          invitationId: event.invitation.id,
          email: event.invitation.email,
          role: event.invitation.role,
        },
        changes: [
          {
            entityType: 'invitation',
            entityId: event.invitation.id,
            newValue: event.invitation.email,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'MemberInvitedEvent', projectId: event.invitation.project.id },
        'Failed to log member invited activity'
      );
    }
  }

  private async handleInvitationAccepted(event: InvitationAcceptedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'invitation_accept',
        projectId: event.invitation.project.id,
        userId: event.userId,
        metadata: {
          invitationId: event.invitation.id,
          role: event.invitation.role,
        },
        changes: [
          {
            entityType: 'member',
            entityId: event.userId,
            newValue: event.invitation.role,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'InvitationAcceptedEvent', projectId: event.invitation.project.id },
        'Failed to log invitation accepted activity'
      );
    }
  }
}
