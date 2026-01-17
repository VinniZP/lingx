/**
 * GetUserDetailsHandler Unit Tests
 *
 * Tests for getting user details query handler (admin only).
 */

import type { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { GetUserDetailsHandler } from '../queries/get-user-details.handler.js';
import { GetUserDetailsQuery } from '../queries/get-user-details.query.js';
import type { AdminRepository, UserWithProjects } from '../repositories/admin.repository.js';

interface MockAdminRepository {
  findAllUsers: Mock;
  findUserById: Mock;
  findUserActivity: Mock;
  updateUserDisabled: Mock;
  anonymizeUserActivity: Mock;
  getLastActiveAt: Mock;
  findUserRoleById: Mock;
}

function createMockRepository(): MockAdminRepository {
  return {
    findAllUsers: vi.fn(),
    findUserById: vi.fn(),
    findUserActivity: vi.fn(),
    updateUserDisabled: vi.fn(),
    anonymizeUserActivity: vi.fn(),
    getLastActiveAt: vi.fn(),
    findUserRoleById: vi.fn(),
  };
}

describe('GetUserDetailsHandler', () => {
  let handler: GetUserDetailsHandler;
  let mockRepository: MockAdminRepository;

  const mockUser: UserWithProjects = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    avatarUrl: null,
    role: 'DEVELOPER' as Role,
    isDisabled: false,
    disabledAt: null,
    createdAt: new Date('2024-01-01'),
    disabledBy: null,
    projectMembers: [
      {
        role: 'OWNER',
        project: { id: 'project-1', name: 'Project 1', slug: 'project-1' },
      },
      {
        role: 'DEVELOPER',
        project: { id: 'project-2', name: 'Project 2', slug: 'project-2' },
      },
    ],
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    handler = new GetUserDetailsHandler(mockRepository as unknown as AdminRepository);
  });

  describe('execute', () => {
    it('should return user details with projects and stats when actor is ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('ADMIN');
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.getLastActiveAt.mockResolvedValue(new Date('2024-06-15T10:00:00Z'));

      const query = new GetUserDetailsQuery('user-1', 'admin-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('alice@example.com');
      expect(result.projectMembers).toHaveLength(2);
      expect(result.stats.projectCount).toBe(2);
      expect(result.stats.lastActiveAt).toEqual(new Date('2024-06-15T10:00:00Z'));
      expect(mockRepository.findUserRoleById).toHaveBeenCalledWith('admin-user');
      expect(mockRepository.findUserById).toHaveBeenCalledWith('user-1');
      expect(mockRepository.getLastActiveAt).toHaveBeenCalledWith('user-1');
    });

    it('should return disabled user details with disabledBy info', async () => {
      // Arrange
      const disabledUser: UserWithProjects = {
        ...mockUser,
        isDisabled: true,
        disabledAt: new Date('2024-06-01'),
        disabledBy: {
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
        },
      };

      mockRepository.findUserRoleById.mockResolvedValue('ADMIN');
      mockRepository.findUserById.mockResolvedValue(disabledUser);
      mockRepository.getLastActiveAt.mockResolvedValue(null);

      const query = new GetUserDetailsQuery('user-1', 'admin-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.isDisabled).toBe(true);
      expect(result.disabledBy?.id).toBe('admin-1');
      expect(result.disabledBy?.name).toBe('Admin User');
    });

    it('should throw ForbiddenError when actor is not ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('DEVELOPER');

      const query = new GetUserDetailsQuery('user-1', 'regular-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Admin access required');
      expect(mockRepository.findUserById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when target user not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('ADMIN');
      mockRepository.findUserById.mockResolvedValue(null);

      const query = new GetUserDetailsQuery('nonexistent', 'admin-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('User not found');
    });

    it('should throw NotFoundError when actor not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue(null);

      const query = new GetUserDetailsQuery('user-1', 'nonexistent');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('User not found');
    });

    it('should return null lastActiveAt when user has no sessions', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('ADMIN');
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.getLastActiveAt.mockResolvedValue(null);

      const query = new GetUserDetailsQuery('user-1', 'admin-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.stats.lastActiveAt).toBeNull();
    });
  });
});
