/**
 * AcceptInvitationHandler Unit Tests
 *
 * Tests for accepting a project invitation.
 *
 * Validation:
 * - Token must exist and not be expired/accepted/revoked
 * - User's email must match invitation email
 *
 * Logic:
 * - Create ProjectMember record
 * - Mark invitation as accepted
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { AcceptInvitationCommand } from '../commands/accept-invitation.command.js';
import { AcceptInvitationHandler } from '../commands/accept-invitation.handler.js';
import { InvitationAcceptedEvent } from '../events/invitation-accepted.event.js';
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
  findUserById: Mock;
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

interface MockPrisma {
  $transaction: Mock;
  projectMember: { create: Mock };
  projectInvitation: { update: Mock };
}

function createMockPrisma(): MockPrisma {
  const mockTx = {
    projectMember: { create: vi.fn() },
    projectInvitation: { update: vi.fn() },
  };
  return {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    }),
    projectMember: mockTx.projectMember,
    projectInvitation: mockTx.projectInvitation,
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
    findUserById: vi.fn(),
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
    invitedBy: { id: 'inviter-1', name: 'Inviter', email: 'inviter@example.com' },
    ...overrides,
  };
}

describe('AcceptInvitationHandler', () => {
  let handler: AcceptInvitationHandler;
  let mockMemberRepository: MockMemberRepository;
  let mockInvitationRepository: MockInvitationRepository;
  let mockEventBus: MockEventBus;
  let mockPrisma: MockPrisma;

  const now = new Date('2024-01-15T12:00:00Z');
  const futureDate = new Date('2024-01-22T12:00:00Z');
  const pastDate = new Date('2024-01-10T12:00:00Z');

  const userId = 'user-1';
  const userEmail = 'invited@example.com';
  const token = 'valid-token';
  const projectId = 'project-1';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockMemberRepository = createMockMemberRepository();
    mockInvitationRepository = createMockInvitationRepository();
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrisma();
    handler = new AcceptInvitationHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockInvitationRepository as unknown as InvitationRepository,
      mockEventBus as unknown as IEventBus,
      mockPrisma as unknown as PrismaClient
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    describe('successful acceptance', () => {
      it('should accept invitation and create member via transaction', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        mockMemberRepository.findMemberByUserId.mockResolvedValue(null); // Not already a member
        const invitation = createMockInvitation({
          token,
          email: userEmail,
          expiresAt: futureDate,
        });
        mockInvitationRepository.findByToken.mockResolvedValue(invitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act
        await handler.execute(command);

        // Assert - transaction was called
        expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
        // Assert - member was created in transaction
        expect(mockPrisma.projectMember.create).toHaveBeenCalledWith({
          data: {
            projectId,
            userId,
            role: 'DEVELOPER',
          },
        });
        // Assert - invitation was marked accepted in transaction
        expect(mockPrisma.projectInvitation.update).toHaveBeenCalledWith({
          where: { id: invitation.id },
          data: { acceptedAt: expect.any(Date) },
        });
      });

      it('should create member with correct role from invitation', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        mockMemberRepository.findMemberByUserId.mockResolvedValue(null);
        const invitation = createMockInvitation({
          token,
          email: userEmail,
          role: 'MANAGER',
          expiresAt: futureDate,
        });
        mockInvitationRepository.findByToken.mockResolvedValue(invitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockPrisma.projectMember.create).toHaveBeenCalledWith({
          data: {
            projectId,
            userId,
            role: 'MANAGER',
          },
        });
      });

      it('should emit InvitationAcceptedEvent on successful acceptance', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        mockMemberRepository.findMemberByUserId.mockResolvedValue(null);
        const invitation = createMockInvitation({
          token,
          email: userEmail,
          expiresAt: futureDate,
        });
        mockInvitationRepository.findByToken.mockResolvedValue(invitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledOnce();
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent).toBeInstanceOf(InvitationAcceptedEvent);
        expect(publishedEvent.invitation).toBe(invitation);
        expect(publishedEvent.userId).toBe(userId);
      });
    });

    describe('user already a member', () => {
      it('should throw BadRequestError when user is already a project member', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        const invitation = createMockInvitation({
          token,
          email: userEmail,
          expiresAt: futureDate,
        });
        mockInvitationRepository.findByToken.mockResolvedValue(invitation);
        mockMemberRepository.findMemberByUserId.mockResolvedValue(
          createMockMember({ userId, role: 'DEVELOPER' })
        );

        const command = new AcceptInvitationCommand(token, userId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'You are already a member of this project'
        );
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });
    });

    describe('user validation', () => {
      it('should throw NotFoundError when user does not exist', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue(null);

        const command = new AcceptInvitationCommand(token, userId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('User');
      });
    });

    describe('token validation', () => {
      it('should throw NotFoundError when token does not exist', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        mockInvitationRepository.findByToken.mockResolvedValue(null);

        const command = new AcceptInvitationCommand('nonexistent-token', userId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Invitation');
      });

      it('should throw BadRequestError when invitation is expired', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        const expiredInvitation = createMockInvitation({
          token,
          email: userEmail,
          expiresAt: pastDate,
        });
        mockInvitationRepository.findByToken.mockResolvedValue(expiredInvitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('invitation has expired');
      });

      it('should throw BadRequestError when invitation is already accepted', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        const acceptedInvitation = createMockInvitation({
          token,
          email: userEmail,
          expiresAt: futureDate,
          acceptedAt: new Date('2024-01-14'),
        });
        mockInvitationRepository.findByToken.mockResolvedValue(acceptedInvitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'invitation has already been accepted'
        );
      });

      it('should throw BadRequestError when invitation is revoked', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        const revokedInvitation = createMockInvitation({
          token,
          email: userEmail,
          expiresAt: futureDate,
          revokedAt: new Date('2024-01-14'),
        });
        mockInvitationRepository.findByToken.mockResolvedValue(revokedInvitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('invitation has been revoked');
      });
    });

    describe('email validation', () => {
      it('should throw ForbiddenError when user email does not match invitation', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({ id: userId, email: userEmail });
        const invitation = createMockInvitation({
          token,
          email: 'other@example.com',
          expiresAt: futureDate,
        });
        mockInvitationRepository.findByToken.mockResolvedValue(invitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('invitation is not for your email');
      });

      it('should accept case-insensitive email matching', async () => {
        // Arrange
        mockMemberRepository.findUserById.mockResolvedValue({
          id: userId,
          email: 'invited@example.com',
        });
        mockMemberRepository.findMemberByUserId.mockResolvedValue(null);
        const invitation = createMockInvitation({
          token,
          email: 'INVITED@EXAMPLE.COM',
          expiresAt: futureDate,
        });
        mockInvitationRepository.findByToken.mockResolvedValue(invitation);

        const command = new AcceptInvitationCommand(token, userId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });
    });
  });
});
