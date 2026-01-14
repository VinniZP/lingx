/**
 * MemberActivityHandler Unit Tests
 *
 * Tests for member-related activity logging event handler.
 *
 * Events handled:
 * - MemberRoleChangedEvent -> logs "member_role_change" activity
 * - MemberRemovedEvent -> logs "member_remove" activity
 * - MemberLeftEvent -> logs "member_leave" activity
 * - OwnershipTransferredEvent -> logs "ownership_transfer" activity
 * - MemberInvitedEvent -> logs "member_invite" activity
 * - InvitationAcceptedEvent -> logs "invitation_accept" activity
 */

import type { ProjectRole } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ActivityService } from '../../../services/activity.service.js';
import { InvitationAcceptedEvent } from '../events/invitation-accepted.event.js';
import { MemberInvitedEvent } from '../events/member-invited.event.js';
import { MemberLeftEvent } from '../events/member-left.event.js';
import { MemberRemovedEvent } from '../events/member-removed.event.js';
import { MemberRoleChangedEvent } from '../events/member-role-changed.event.js';
import { OwnershipTransferredEvent } from '../events/ownership-transferred.event.js';
import { MemberActivityHandler } from '../handlers/member-activity.handler.js';
import type { InvitationWithDetails } from '../repositories/invitation.repository.js';

interface MockActivityService {
  log: Mock;
}

function createMockActivityService(): MockActivityService {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

interface MockLogger {
  info: Mock;
  warn: Mock;
  error: Mock;
  debug: Mock;
  trace: Mock;
  fatal: Mock;
  child: Mock;
}

function createMockLogger(): MockLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

function createMockInvitation(
  overrides: Partial<InvitationWithDetails> = {}
): InvitationWithDetails {
  return {
    id: 'inv-1',
    email: 'invited@example.com',
    role: 'DEVELOPER' as ProjectRole,
    token: 'test-token',
    expiresAt: new Date('2024-01-22'),
    acceptedAt: null,
    revokedAt: null,
    createdAt: new Date('2024-01-15'),
    project: { id: 'project-1', name: 'Test Project', slug: 'test-project' },
    invitedBy: { id: 'inviter-1', name: 'Inviter', email: 'inviter@example.com' },
    ...overrides,
  };
}

describe('MemberActivityHandler', () => {
  let handler: MemberActivityHandler;
  let mockActivityService: MockActivityService;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockActivityService = createMockActivityService();
    mockLogger = createMockLogger();
    handler = new MemberActivityHandler(
      mockActivityService as unknown as ActivityService,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('handle MemberRoleChangedEvent', () => {
    it('should log member_role_change activity', async () => {
      // Arrange
      const event = new MemberRoleChangedEvent(
        'project-1',
        'user-1',
        'DEVELOPER',
        'MANAGER',
        'actor-1'
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'member_role_change',
        projectId: 'project-1',
        userId: 'actor-1',
        metadata: {
          targetUserId: 'user-1',
          oldRole: 'DEVELOPER',
          newRole: 'MANAGER',
        },
        changes: [
          {
            entityType: 'member',
            entityId: 'user-1',
            keyName: 'role',
            oldValue: 'DEVELOPER',
            newValue: 'MANAGER',
          },
        ],
      });
    });

    it('should track promotion to OWNER', async () => {
      // Arrange
      const event = new MemberRoleChangedEvent(
        'project-1',
        'user-1',
        'MANAGER',
        'OWNER',
        'actor-1'
      );

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.metadata.oldRole).toBe('MANAGER');
      expect(call.metadata.newRole).toBe('OWNER');
    });
  });

  describe('handle MemberRemovedEvent', () => {
    it('should log member_remove activity', async () => {
      // Arrange
      const event = new MemberRemovedEvent('project-1', 'user-1', 'DEVELOPER', 'actor-1');

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'member_remove',
        projectId: 'project-1',
        userId: 'actor-1',
        metadata: {
          targetUserId: 'user-1',
          role: 'DEVELOPER',
        },
        changes: [
          {
            entityType: 'member',
            entityId: 'user-1',
            oldValue: 'DEVELOPER',
          },
        ],
      });
    });

    it('should track role in metadata', async () => {
      // Arrange
      const event = new MemberRemovedEvent('project-1', 'user-1', 'MANAGER', 'actor-1');

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.metadata.role).toBe('MANAGER');
    });
  });

  describe('handle MemberLeftEvent', () => {
    it('should log member_leave activity', async () => {
      // Arrange
      const event = new MemberLeftEvent('project-1', 'user-1', 'DEVELOPER');

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'member_leave',
        projectId: 'project-1',
        userId: 'user-1',
        metadata: {
          role: 'DEVELOPER',
        },
        changes: [
          {
            entityType: 'member',
            entityId: 'user-1',
            oldValue: 'DEVELOPER',
          },
        ],
      });
    });

    it('should use userId as actor (self-action)', async () => {
      // Arrange
      const event = new MemberLeftEvent('project-1', 'user-1', 'MANAGER');

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.userId).toBe('user-1');
    });
  });

  describe('handle OwnershipTransferredEvent', () => {
    it('should log ownership_transfer activity', async () => {
      // Arrange
      const event = new OwnershipTransferredEvent('project-1', 'new-owner-1', 'old-owner-1', true);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'ownership_transfer',
        projectId: 'project-1',
        userId: 'old-owner-1',
        metadata: {
          newOwnerId: 'new-owner-1',
          previousOwnerKeptOwnership: true,
        },
        changes: [
          {
            entityType: 'member',
            entityId: 'new-owner-1',
            keyName: 'role',
            newValue: 'OWNER',
          },
        ],
      });
    });

    it('should track when previous owner gives up ownership', async () => {
      // Arrange
      const event = new OwnershipTransferredEvent('project-1', 'new-owner-1', 'old-owner-1', false);

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.metadata.previousOwnerKeptOwnership).toBe(false);
    });
  });

  describe('handle MemberInvitedEvent', () => {
    it('should log member_invite activity', async () => {
      // Arrange
      const invitation = createMockInvitation();
      const event = new MemberInvitedEvent(invitation, 'inviter-1');

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'member_invite',
        projectId: 'project-1',
        userId: 'inviter-1',
        metadata: {
          invitationId: 'inv-1',
          email: 'invited@example.com',
          role: 'DEVELOPER',
        },
        changes: [
          {
            entityType: 'invitation',
            entityId: 'inv-1',
            newValue: 'invited@example.com',
          },
        ],
      });
    });

    it('should include role in metadata', async () => {
      // Arrange
      const invitation = createMockInvitation({ role: 'MANAGER' });
      const event = new MemberInvitedEvent(invitation, 'inviter-1');

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.metadata.role).toBe('MANAGER');
    });
  });

  describe('handle InvitationAcceptedEvent', () => {
    it('should log invitation_accept activity', async () => {
      // Arrange
      const invitation = createMockInvitation();
      const event = new InvitationAcceptedEvent(invitation, 'user-1');

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'invitation_accept',
        projectId: 'project-1',
        userId: 'user-1',
        metadata: {
          invitationId: 'inv-1',
          role: 'DEVELOPER',
        },
        changes: [
          {
            entityType: 'member',
            entityId: 'user-1',
            newValue: 'DEVELOPER',
          },
        ],
      });
    });

    it('should track the role that was accepted', async () => {
      // Arrange
      const invitation = createMockInvitation({ role: 'MANAGER' });
      const event = new InvitationAcceptedEvent(invitation, 'user-1');

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.metadata.role).toBe('MANAGER');
      expect(call.changes[0].newValue).toBe('MANAGER');
    });
  });

  // Note: Unknown event tests removed - TypeScript now enforces at compile time
  // that only MemberEvent types can be passed to the handler.

  describe('error handling', () => {
    it('should catch and log activity service errors without throwing', async () => {
      // Arrange
      const event = new MemberRoleChangedEvent(
        'project-1',
        'user-1',
        'DEVELOPER',
        'MANAGER',
        'actor-1'
      );
      mockActivityService.log.mockRejectedValue(new Error('Activity service unavailable'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          eventName: 'MemberRoleChangedEvent',
          projectId: 'project-1',
        }),
        'Failed to log member role change activity'
      );
    });

    it('should catch errors from member removed event logging', async () => {
      // Arrange
      const event = new MemberRemovedEvent('project-1', 'user-1', 'DEVELOPER', 'actor-1');
      mockActivityService.log.mockRejectedValue(new Error('Redis unavailable'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'MemberRemovedEvent',
          projectId: 'project-1',
        }),
        'Failed to log member removal activity'
      );
    });

    it('should catch errors from member left event logging', async () => {
      // Arrange
      const event = new MemberLeftEvent('project-1', 'user-1', 'DEVELOPER');
      mockActivityService.log.mockRejectedValue(new Error('Queue full'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'MemberLeftEvent',
          projectId: 'project-1',
        }),
        'Failed to log member leave activity'
      );
    });

    it('should catch errors from ownership transfer event logging', async () => {
      // Arrange
      const event = new OwnershipTransferredEvent('project-1', 'new-owner', 'old-owner', true);
      mockActivityService.log.mockRejectedValue(new Error('Connection timeout'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'OwnershipTransferredEvent',
          projectId: 'project-1',
        }),
        'Failed to log ownership transfer activity'
      );
    });

    it('should catch errors from member invited event logging', async () => {
      // Arrange
      const invitation = createMockInvitation();
      const event = new MemberInvitedEvent(invitation, 'inviter-1');
      mockActivityService.log.mockRejectedValue(new Error('Service unavailable'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'MemberInvitedEvent',
          projectId: 'project-1',
        }),
        'Failed to log member invited activity'
      );
    });

    it('should catch errors from invitation accepted event logging', async () => {
      // Arrange
      const invitation = createMockInvitation();
      const event = new InvitationAcceptedEvent(invitation, 'user-1');
      mockActivityService.log.mockRejectedValue(new Error('Write error'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'InvitationAcceptedEvent',
          projectId: 'project-1',
        }),
        'Failed to log invitation accepted activity'
      );
    });
  });
});
