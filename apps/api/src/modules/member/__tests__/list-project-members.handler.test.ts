/**
 * ListProjectMembersHandler Unit Tests
 *
 * Tests for listing project members query handler.
 */

import type { ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ListProjectMembersHandler } from '../queries/list-project-members.handler.js';
import { ListProjectMembersQuery } from '../queries/list-project-members.query.js';
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

function createMockRepository(): MockMemberRepository {
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

describe('ListProjectMembersHandler', () => {
  let handler: ListProjectMembersHandler;
  let mockRepository: MockMemberRepository;

  const mockMembers: ProjectMemberWithUser[] = [
    {
      userId: 'user-1',
      role: 'OWNER' as ProjectRole,
      createdAt: new Date('2024-01-01'),
      user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: 'https://...' },
    },
    {
      userId: 'user-2',
      role: 'MANAGER' as ProjectRole,
      createdAt: new Date('2024-01-02'),
      user: { id: 'user-2', name: 'Bob', email: 'bob@example.com', avatarUrl: null },
    },
    {
      userId: 'user-3',
      role: 'DEVELOPER' as ProjectRole,
      createdAt: new Date('2024-01-03'),
      user: { id: 'user-3', name: 'Charlie', email: 'charlie@example.com', avatarUrl: null },
    },
  ];

  beforeEach(() => {
    mockRepository = createMockRepository();
    handler = new ListProjectMembersHandler(mockRepository as unknown as MemberRepository);
  });

  describe('execute', () => {
    it('should return list of project members when user is a member', async () => {
      // Arrange
      mockRepository.findMemberByUserId.mockResolvedValue(mockMembers[0]); // User is a member
      mockRepository.findProjectMembers.mockResolvedValue(mockMembers);

      const query = new ListProjectMembersQuery('project-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockMembers);
      expect(result).toHaveLength(3);
      expect(mockRepository.findMemberByUserId).toHaveBeenCalledWith('project-1', 'user-1');
      expect(mockRepository.findProjectMembers).toHaveBeenCalledWith('project-1');
    });

    it('should throw ForbiddenError when user is not a member', async () => {
      // Arrange
      mockRepository.findMemberByUserId.mockResolvedValue(null); // User is not a member

      const query = new ListProjectMembersQuery('project-1', 'non-member');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('You are not a member of this project');
      expect(mockRepository.findProjectMembers).not.toHaveBeenCalled();
    });

    it('should return empty array when project has no members', async () => {
      // Arrange
      mockRepository.findMemberByUserId.mockResolvedValue(mockMembers[0]); // User is a member
      mockRepository.findProjectMembers.mockResolvedValue([]);

      const query = new ListProjectMembersQuery('project-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return members with correct user details', async () => {
      // Arrange
      mockRepository.findMemberByUserId.mockResolvedValue(mockMembers[0]);
      mockRepository.findProjectMembers.mockResolvedValue(mockMembers);

      const query = new ListProjectMembersQuery('project-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result[0].user.name).toBe('Alice');
      expect(result[0].user.email).toBe('alice@example.com');
      expect(result[0].role).toBe('OWNER');
    });

    it('should allow DEVELOPER to view members', async () => {
      // Arrange - user-3 is a DEVELOPER
      mockRepository.findMemberByUserId.mockResolvedValue(mockMembers[2]); // DEVELOPER
      mockRepository.findProjectMembers.mockResolvedValue(mockMembers);

      const query = new ListProjectMembersQuery('project-1', 'user-3');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockMembers);
    });
  });
});
