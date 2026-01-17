/**
 * ListUsersHandler Unit Tests
 *
 * Tests for listing users query handler (admin only).
 */

import type { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ListUsersHandler } from '../queries/list-users.handler.js';
import { ListUsersQuery } from '../queries/list-users.query.js';
import type {
  AdminRepository,
  AdminUserListItem,
  PaginatedUsers,
} from '../repositories/admin.repository.js';

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

describe('ListUsersHandler', () => {
  let handler: ListUsersHandler;
  let mockRepository: MockAdminRepository;

  const mockUsers: AdminUserListItem[] = [
    {
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      avatarUrl: null,
      role: 'DEVELOPER' as Role,
      isDisabled: false,
      disabledAt: null,
      createdAt: new Date('2024-01-01'),
      _count: { projectMembers: 3 },
    },
    {
      id: 'user-2',
      email: 'bob@example.com',
      name: 'Bob',
      avatarUrl: 'https://...',
      role: 'ADMIN' as Role,
      isDisabled: false,
      disabledAt: null,
      createdAt: new Date('2024-02-01'),
      _count: { projectMembers: 5 },
    },
  ];

  const mockPaginatedResult: PaginatedUsers = {
    users: mockUsers,
    total: 50,
    page: 1,
    limit: 50,
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    handler = new ListUsersHandler(mockRepository as unknown as AdminRepository);
  });

  describe('execute', () => {
    it('should return paginated users when actor is ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('ADMIN');
      mockRepository.findAllUsers.mockResolvedValue(mockPaginatedResult);

      const query = new ListUsersQuery({}, { page: 1, limit: 50 }, 'admin-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(mockRepository.findUserRoleById).toHaveBeenCalledWith('admin-user');
      expect(mockRepository.findAllUsers).toHaveBeenCalledWith({}, { page: 1, limit: 50 });
    });

    it('should throw ForbiddenError when actor is not ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('DEVELOPER');

      const query = new ListUsersQuery({}, { page: 1, limit: 50 }, 'regular-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Admin access required');
      expect(mockRepository.findAllUsers).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when actor is MANAGER', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('MANAGER');

      const query = new ListUsersQuery({}, { page: 1, limit: 50 }, 'manager-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Admin access required');
    });

    it('should pass filters to repository', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('ADMIN');
      mockRepository.findAllUsers.mockResolvedValue({ ...mockPaginatedResult, users: [] });

      const query = new ListUsersQuery(
        { role: 'DEVELOPER', status: 'active', search: 'test' },
        { page: 2, limit: 25 },
        'admin-user'
      );

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findAllUsers).toHaveBeenCalledWith(
        { role: 'DEVELOPER', status: 'active', search: 'test' },
        { page: 2, limit: 25 }
      );
    });

    it('should return empty list when no users match filters', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('ADMIN');
      mockRepository.findAllUsers.mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      const query = new ListUsersQuery(
        { search: 'nonexistent' },
        { page: 1, limit: 50 },
        'admin-user'
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw error when actor user not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue(null);

      const query = new ListUsersQuery({}, { page: 1, limit: 50 }, 'nonexistent-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('User not found');
    });
  });
});
