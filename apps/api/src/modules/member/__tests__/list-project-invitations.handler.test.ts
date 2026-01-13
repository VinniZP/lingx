/**
 * ListProjectInvitationsHandler Unit Tests
 *
 * Tests for listing pending project invitations query handler.
 */

import type { ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ListProjectInvitationsHandler } from '../queries/list-project-invitations.handler.js';
import { ListProjectInvitationsQuery } from '../queries/list-project-invitations.query.js';
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

describe('ListProjectInvitationsHandler', () => {
  let handler: ListProjectInvitationsHandler;
  let mockMemberRepository: MockMemberRepository;
  let mockInvitationRepository: MockInvitationRepository;

  const ownerMembership: ProjectMemberWithUser = {
    userId: 'user-1',
    role: 'OWNER' as ProjectRole,
    createdAt: new Date('2024-01-01'),
    user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null },
  };

  const managerMembership: ProjectMemberWithUser = {
    userId: 'user-2',
    role: 'MANAGER' as ProjectRole,
    createdAt: new Date('2024-01-02'),
    user: { id: 'user-2', name: 'Bob', email: 'bob@example.com', avatarUrl: null },
  };

  const developerMembership: ProjectMemberWithUser = {
    userId: 'user-3',
    role: 'DEVELOPER' as ProjectRole,
    createdAt: new Date('2024-01-03'),
    user: { id: 'user-3', name: 'Charlie', email: 'charlie@example.com', avatarUrl: null },
  };

  const mockInvitations: InvitationWithDetails[] = [
    {
      id: 'inv-1',
      email: 'new-user@example.com',
      role: 'DEVELOPER' as ProjectRole,
      token: 'token-1',
      expiresAt: new Date('2024-02-01'),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date('2024-01-15'),
      project: { id: 'project-1', name: 'My Project', slug: 'my-project' },
      invitedBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    },
    {
      id: 'inv-2',
      email: 'another-user@example.com',
      role: 'MANAGER' as ProjectRole,
      token: 'token-2',
      expiresAt: new Date('2024-02-05'),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date('2024-01-20'),
      project: { id: 'project-1', name: 'My Project', slug: 'my-project' },
      invitedBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    },
  ];

  beforeEach(() => {
    mockMemberRepository = createMockMemberRepository();
    mockInvitationRepository = createMockInvitationRepository();
    handler = new ListProjectInvitationsHandler(
      mockMemberRepository as unknown as MemberRepository,
      mockInvitationRepository as unknown as InvitationRepository
    );
  });

  describe('execute', () => {
    it('should return pending invitations when user is OWNER', async () => {
      // Arrange
      mockMemberRepository.findMemberByUserId.mockResolvedValue(ownerMembership);
      mockInvitationRepository.findPendingByProject.mockResolvedValue(mockInvitations);

      const query = new ListProjectInvitationsQuery('project-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockInvitations);
      expect(result).toHaveLength(2);
      expect(mockMemberRepository.findMemberByUserId).toHaveBeenCalledWith('project-1', 'user-1');
      expect(mockInvitationRepository.findPendingByProject).toHaveBeenCalledWith('project-1');
    });

    it('should return pending invitations when user is MANAGER', async () => {
      // Arrange
      mockMemberRepository.findMemberByUserId.mockResolvedValue(managerMembership);
      mockInvitationRepository.findPendingByProject.mockResolvedValue(mockInvitations);

      const query = new ListProjectInvitationsQuery('project-1', 'user-2');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockInvitations);
    });

    it('should throw ForbiddenError when user is DEVELOPER', async () => {
      // Arrange
      mockMemberRepository.findMemberByUserId.mockResolvedValue(developerMembership);

      const query = new ListProjectInvitationsQuery('project-1', 'user-3');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Only MANAGER or OWNER can view pending invitations'
      );
      expect(mockInvitationRepository.findPendingByProject).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not a member', async () => {
      // Arrange
      mockMemberRepository.findMemberByUserId.mockResolvedValue(null);

      const query = new ListProjectInvitationsQuery('project-1', 'non-member');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('You are not a member of this project');
      expect(mockInvitationRepository.findPendingByProject).not.toHaveBeenCalled();
    });

    it('should return empty array when no pending invitations', async () => {
      // Arrange
      mockMemberRepository.findMemberByUserId.mockResolvedValue(ownerMembership);
      mockInvitationRepository.findPendingByProject.mockResolvedValue([]);

      const query = new ListProjectInvitationsQuery('project-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return invitations with inviter details', async () => {
      // Arrange
      mockMemberRepository.findMemberByUserId.mockResolvedValue(ownerMembership);
      mockInvitationRepository.findPendingByProject.mockResolvedValue(mockInvitations);

      const query = new ListProjectInvitationsQuery('project-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result[0].invitedBy.name).toBe('Alice');
      expect(result[0].invitedBy.email).toBe('alice@example.com');
    });
  });
});
