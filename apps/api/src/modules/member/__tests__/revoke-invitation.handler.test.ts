/**
 * RevokeInvitationHandler Unit Tests
 *
 * Tests for revoking a pending project invitation.
 *
 * Permission rules:
 * - MANAGER+ role required
 * - MANAGER can revoke ANY pending DEVELOPER invitation
 * - OWNER can revoke any invitation
 */

import type { ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { RevokeInvitationCommand } from '../commands/revoke-invitation.command.js';
import { RevokeInvitationHandler } from '../commands/revoke-invitation.handler.js';
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

describe('RevokeInvitationHandler', () => {
  let handler: RevokeInvitationHandler;
  let mockMemberRepository: MockMemberRepository;
  let mockInvitationRepository: MockInvitationRepository;

  const projectId = 'project-1';
  const ownerId = 'owner-1';
  const managerId = 'manager-1';
  const developerId = 'developer-1';
  const invitationId = 'inv-1';

  const ownerMember = createMockMember({ userId: ownerId, role: 'OWNER' });
  const managerMember = createMockMember({ userId: managerId, role: 'MANAGER' });
  const developerMember = createMockMember({ userId: developerId, role: 'DEVELOPER' });

  beforeEach(() => {
    mockMemberRepository = createMockMemberRepository();
    mockInvitationRepository = createMockInvitationRepository();
    handler = new RevokeInvitationHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockInvitationRepository as unknown as InvitationRepository
    );
  });

  describe('execute', () => {
    describe('OWNER permissions', () => {
      it('should allow OWNER to revoke DEVELOPER invitation', async () => {
        // Arrange
        const invitation = createMockInvitation({ id: invitationId, role: 'DEVELOPER' });
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.findById.mockResolvedValue(invitation);
        mockInvitationRepository.markRevoked.mockResolvedValue(undefined);

        const command = new RevokeInvitationCommand(invitationId, projectId, ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockInvitationRepository.markRevoked).toHaveBeenCalledWith(invitationId);
      });

      it('should allow OWNER to revoke MANAGER invitation', async () => {
        // Arrange
        const invitation = createMockInvitation({ id: invitationId, role: 'MANAGER' });
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.findById.mockResolvedValue(invitation);
        mockInvitationRepository.markRevoked.mockResolvedValue(undefined);

        const command = new RevokeInvitationCommand(invitationId, projectId, ownerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockInvitationRepository.markRevoked).toHaveBeenCalledWith(invitationId);
      });
    });

    describe('MANAGER permissions', () => {
      it('should allow MANAGER to revoke DEVELOPER invitation', async () => {
        // Arrange
        const invitation = createMockInvitation({ id: invitationId, role: 'DEVELOPER' });
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(managerMember);
        mockInvitationRepository.findById.mockResolvedValue(invitation);
        mockInvitationRepository.markRevoked.mockResolvedValue(undefined);

        const command = new RevokeInvitationCommand(invitationId, projectId, managerId);

        // Act
        await handler.execute(command);

        // Assert
        expect(mockInvitationRepository.markRevoked).toHaveBeenCalledWith(invitationId);
      });

      it('should throw ForbiddenError when MANAGER tries to revoke MANAGER invitation', async () => {
        // Arrange
        const invitation = createMockInvitation({ id: invitationId, role: 'MANAGER' });
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(managerMember);
        mockInvitationRepository.findById.mockResolvedValue(invitation);

        const command = new RevokeInvitationCommand(invitationId, projectId, managerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Only owners can revoke manager invitations'
        );
      });
    });

    describe('DEVELOPER permissions', () => {
      it('should throw ForbiddenError when DEVELOPER tries to revoke any invitation', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(developerMember);

        const command = new RevokeInvitationCommand(invitationId, projectId, developerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Only owners and managers can revoke invitations'
        );
      });
    });

    describe('validation errors', () => {
      it('should throw ForbiddenError when actor is not a member', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(null);

        const command = new RevokeInvitationCommand(invitationId, projectId, 'nonmember');

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'You are not a member of this project'
        );
      });

      it('should throw NotFoundError when invitation does not exist', async () => {
        // Arrange
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.findById.mockResolvedValue(null);

        const command = new RevokeInvitationCommand('nonexistent', projectId, ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow('Invitation');
      });

      it('should throw BadRequestError when invitation belongs to different project', async () => {
        // Arrange
        const invitation = createMockInvitation({
          id: invitationId,
          project: { id: 'other-project', name: 'Other', slug: 'other' },
        });
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.findById.mockResolvedValue(invitation);

        const command = new RevokeInvitationCommand(invitationId, projectId, ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Invitation does not belong to this project'
        );
      });

      it('should throw BadRequestError when invitation is already accepted', async () => {
        // Arrange
        const invitation = createMockInvitation({
          id: invitationId,
          acceptedAt: new Date('2024-01-14'),
        });
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.findById.mockResolvedValue(invitation);

        const command = new RevokeInvitationCommand(invitationId, projectId, ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Cannot revoke an already accepted invitation'
        );
      });

      it('should throw BadRequestError when invitation is already revoked', async () => {
        // Arrange
        const invitation = createMockInvitation({
          id: invitationId,
          revokedAt: new Date('2024-01-14'),
        });
        mockMemberRepository.findMemberByUserId.mockResolvedValueOnce(ownerMember);
        mockInvitationRepository.findById.mockResolvedValue(invitation);

        const command = new RevokeInvitationCommand(invitationId, projectId, ownerId);

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          'Invitation has already been revoked'
        );
      });
    });
  });
});
