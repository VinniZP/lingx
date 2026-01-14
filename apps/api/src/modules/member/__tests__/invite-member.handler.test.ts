/**
 * InviteMemberHandler Unit Tests
 *
 * Tests for inviting members to a project.
 *
 * Permission rules:
 * - MANAGER+ role required to invite
 * - MANAGER can only invite as DEVELOPER
 * - OWNER can invite as DEVELOPER or MANAGER
 *
 * Rate limits:
 * - 20 invites per project per hour
 * - 50 invites per user per day
 *
 * Logic:
 * - Skip emails that are already members
 * - Skip emails with existing pending invites
 * - Generate secure token for each invitation
 * - Set 7-day expiry
 */

import type { ProjectRole } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { InviteMemberCommand } from '../commands/invite-member.command.js';
import { InviteMemberHandler } from '../commands/invite-member.handler.js';
import { MemberInvitedEvent } from '../events/member-invited.event.js';
import type {
  InvitationRepository,
  InvitationWithDetails,
} from '../repositories/invitation.repository.js';
import type { MemberRepository, ProjectMemberWithUser } from '../repositories/member.repository.js';

interface MockMemberRepository {
  findProjectMembers: Mock;
  findMemberByUserId: Mock;
  updateMemberRole: Mock;
  removeMember: Mock;
  countOwners: Mock;
  addMember: Mock;
  findUserByEmail: Mock;
}

interface MockInvitationRepository {
  findPendingByProject: Mock;
  findByToken: Mock;
  findPendingByEmail: Mock;
  findById: Mock;
  create: Mock;
  markAccepted: Mock;
  markRevoked: Mock;
  countRecentByProject: Mock;
  countRecentByUser: Mock;
}

interface MockEventBus {
  publish: Mock;
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

function createMockMemberRepository(): MockMemberRepository {
  return {
    findProjectMembers: vi.fn(),
    findMemberByUserId: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    countOwners: vi.fn(),
    addMember: vi.fn(),
    findUserByEmail: vi.fn(),
  };
}

function createMockInvitationRepository(): MockInvitationRepository {
  return {
    findPendingByProject: vi.fn(),
    findByToken: vi.fn(),
    findPendingByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    markAccepted: vi.fn(),
    markRevoked: vi.fn(),
    countRecentByProject: vi.fn(),
    countRecentByUser: vi.fn(),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
  };
}

function createMockMember(overrides: Partial<ProjectMemberWithUser> = {}): ProjectMemberWithUser {
  return {
    userId: 'user-1',
    role: 'DEVELOPER' as ProjectRole,
    createdAt: new Date('2024-01-01'),
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: null,
    },
    ...overrides,
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
    invitedBy: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' },
    ...overrides,
  };
}

describe('InviteMemberHandler', () => {
  let handler: InviteMemberHandler;
  let mockMemberRepository: MockMemberRepository;
  let mockInvitationRepository: MockInvitationRepository;
  let mockEventBus: MockEventBus;
  let mockLogger: MockLogger;

  const projectId = 'project-1';
  const ownerId = 'owner-1';
  const managerId = 'manager-1';
  const developerId = 'developer-1';

  const ownerMember = createMockMember({ userId: ownerId, role: 'OWNER' });
  const managerMember = createMockMember({ userId: managerId, role: 'MANAGER' });
  const developerMember = createMockMember({ userId: developerId, role: 'DEVELOPER' });

  const now = new Date('2024-01-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockMemberRepository = createMockMemberRepository();
    mockInvitationRepository = createMockInvitationRepository();
    mockEventBus = createMockEventBus();
    mockLogger = createMockLogger();
    handler = new InviteMemberHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockInvitationRepository as unknown as InvitationRepository,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    describe('successful invitations', () => {
      it('should successfully invite a single email as DEVELOPER by OWNER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null); // Not already a member
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null); // No pending invite
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual(['new@example.com']);
        expect(result.skipped).toEqual([]);
        expect(result.errors).toEqual([]);
        expect(mockInvitationRepository.create).toHaveBeenCalledOnce();
        expect(mockInvitationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId,
            email: 'new@example.com',
            role: 'DEVELOPER',
            invitedById: ownerId,
          })
        );
      });

      it('should invite as MANAGER when OWNER invites', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(
          createMockInvitation({ role: 'MANAGER' })
        );

        const command = new InviteMemberCommand(projectId, ['new@example.com'], 'MANAGER', ownerId);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual(['new@example.com']);
        expect(mockInvitationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'MANAGER',
          })
        );
      });

      it('should invite multiple emails successfully', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
        const command = new InviteMemberCommand(projectId, emails, 'DEVELOPER', ownerId);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual(emails);
        expect(mockInvitationRepository.create).toHaveBeenCalledTimes(3);
      });

      it('should emit MemberInvitedEvent for each successful invite', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        await handler.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledOnce();
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent).toBeInstanceOf(MemberInvitedEvent);
        expect(publishedEvent.inviterId).toBe(ownerId);
      });

      it('should generate 7-day expiry for invitations', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        await handler.execute(command);

        // Assert
        const createCall = mockInvitationRepository.create.mock.calls[0][0];
        const expectedExpiry = new Date('2024-01-22T12:00:00Z'); // 7 days later
        expect(createCall.expiresAt.getTime()).toBe(expectedExpiry.getTime());
      });

      it('should generate secure token for invitation', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        await handler.execute(command);

        // Assert
        const createCall = mockInvitationRepository.create.mock.calls[0][0];
        expect(createCall.token).toBeDefined();
        expect(createCall.token.length).toBe(64); // 32 bytes hex = 64 chars
      });
    });

    describe('MANAGER permissions', () => {
      it('should allow MANAGER to invite as DEVELOPER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(managerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          managerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual(['new@example.com']);
      });

      it('should throw ForbiddenError when MANAGER tries to invite as MANAGER', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(managerMember);

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'MANAGER',
          managerId
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Managers can only invite as developer'
        );
      });
    });

    describe('DEVELOPER permissions', () => {
      it('should throw ForbiddenError when DEVELOPER tries to invite', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(developerMember);

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          developerId
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Only owners and managers can invite members'
        );
      });
    });

    describe('skip scenarios', () => {
      it('should skip email if user is already a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue({
          id: 'existing-user',
          email: 'existing@example.com',
        });
        mockMemberRepository.findMemberByUserId.mockResolvedValue(createMockMember()); // User is member

        const command = new InviteMemberCommand(
          projectId,
          ['existing@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual([]);
        expect(result.skipped).toEqual(['existing@example.com']);
        expect(mockInvitationRepository.create).not.toHaveBeenCalled();
      });

      it('should skip email if pending invitation exists', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['pending@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual([]);
        expect(result.skipped).toEqual(['pending@example.com']);
      });

      it('should handle mixed results (some sent, some skipped)', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);

        // First email: no pending invite, not a member - should be sent
        mockMemberRepository.findUserByEmail.mockResolvedValueOnce(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValueOnce(null);

        // Second email: has pending invite - should be skipped
        mockMemberRepository.findUserByEmail.mockResolvedValueOnce(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValueOnce(createMockInvitation());

        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com', 'pending@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual(['new@example.com']);
        expect(result.skipped).toEqual(['pending@example.com']);
        expect(mockInvitationRepository.create).toHaveBeenCalledTimes(1);
      });
    });

    describe('rate limiting', () => {
      it('should throw BadRequestError when project rate limit exceeded', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(20); // At limit

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Project invitation rate limit exceeded (20 per hour)'
        );
      });

      it('should throw BadRequestError when user rate limit exceeded', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(50); // At limit

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'User invitation rate limit exceeded (50 per day)'
        );
      });

      it('should allow invitation when project rate is just below limit (19 invites)', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(19); // Just below limit
        mockInvitationRepository.countRecentByUser.mockResolvedValue(0);
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual(['new@example.com']);
        expect(mockInvitationRepository.create).toHaveBeenCalledOnce();
      });

      it('should allow invitation when user rate is just below limit (49 invites)', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.countRecentByProject.mockResolvedValue(0);
        mockInvitationRepository.countRecentByUser.mockResolvedValue(49); // Just below limit
        mockMemberRepository.findUserByEmail.mockResolvedValue(null);
        mockInvitationRepository.findPendingByEmail.mockResolvedValue(null);
        mockInvitationRepository.create.mockResolvedValue(createMockInvitation());

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          ownerId
        );

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.sent).toEqual(['new@example.com']);
        expect(mockInvitationRepository.create).toHaveBeenCalledOnce();
      });
    });

    describe('validation errors', () => {
      it('should throw ForbiddenError when actor is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(null);

        const command = new InviteMemberCommand(
          projectId,
          ['new@example.com'],
          'DEVELOPER',
          'nonmember'
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'You are not a member of this project'
        );
      });

      it('should throw BadRequestError when email array is empty', async () => {
        // Arrange
        const command = new InviteMemberCommand(projectId, [], 'DEVELOPER', ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('At least one email is required');
        // Should not even check membership when email array is empty
        expect(mockMemberRepository.findMemberByUserId).not.toHaveBeenCalled();
      });
    });
  });
});
