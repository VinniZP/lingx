/**
 * GetUserActivityHandler Unit Tests
 *
 * Tests for getting user activity query handler (admin only).
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { GetUserActivityHandler } from '../queries/get-user-activity.handler.js';
import { GetUserActivityQuery } from '../queries/get-user-activity.query.js';
import type { AdminRepository, UserActivity } from '../repositories/admin.repository.js';

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

describe('GetUserActivityHandler', () => {
  let handler: GetUserActivityHandler;
  let mockRepository: MockAdminRepository;

  const mockActivities: UserActivity[] = [
    {
      id: 'activity-1',
      projectId: 'project-1',
      type: 'TRANSLATION_UPDATED',
      metadata: { summary: 'Updated 5 translations' },
      count: 5,
      createdAt: new Date('2024-06-15'),
      project: { id: 'project-1', name: 'Project 1', slug: 'project-1' },
    },
    {
      id: 'activity-2',
      projectId: 'project-2',
      type: 'KEY_CREATED',
      metadata: { summary: 'Created 2 keys' },
      count: 2,
      createdAt: new Date('2024-06-14'),
      project: { id: 'project-2', name: 'Project 2', slug: 'project-2' },
    },
  ];

  beforeEach(() => {
    mockRepository = createMockRepository();
    handler = new GetUserActivityHandler(mockRepository as unknown as AdminRepository);
  });

  describe('execute', () => {
    it('should return user activity when actor is ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check
        .mockResolvedValueOnce('DEVELOPER'); // target exists check
      mockRepository.findUserActivity.mockResolvedValue(mockActivities);

      const query = new GetUserActivityQuery('user-1', 50, 'admin-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('TRANSLATION_UPDATED');
      expect(result[1].type).toBe('KEY_CREATED');
      expect(mockRepository.findUserRoleById).toHaveBeenCalledWith('admin-user');
      expect(mockRepository.findUserActivity).toHaveBeenCalledWith('user-1', 50);
    });

    it('should use default limit of 50', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check
        .mockResolvedValueOnce('DEVELOPER'); // target exists check
      mockRepository.findUserActivity.mockResolvedValue(mockActivities);

      const query = new GetUserActivityQuery('user-1', undefined, 'admin-user');

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findUserActivity).toHaveBeenCalledWith('user-1', 50);
    });

    it('should throw ForbiddenError when actor is not ADMIN', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue('DEVELOPER');

      const query = new GetUserActivityQuery('user-1', 50, 'regular-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Admin access required');
      expect(mockRepository.findUserActivity).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when actor not found', async () => {
      // Arrange
      mockRepository.findUserRoleById.mockResolvedValue(null);

      const query = new GetUserActivityQuery('user-1', 50, 'nonexistent');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('User not found');
    });

    it('should return empty array when user has no activity', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check
        .mockResolvedValueOnce('DEVELOPER'); // target exists check
      mockRepository.findUserActivity.mockResolvedValue([]);

      const query = new GetUserActivityQuery('user-1', 50, 'admin-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual([]);
    });

    it('should respect custom limit parameter', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check
        .mockResolvedValueOnce('DEVELOPER'); // target exists check
      mockRepository.findUserActivity.mockResolvedValue([mockActivities[0]]);

      const query = new GetUserActivityQuery('user-1', 10, 'admin-user');

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findUserActivity).toHaveBeenCalledWith('user-1', 10);
    });

    it('should throw NotFoundError when target user not found', async () => {
      // Arrange
      mockRepository.findUserRoleById
        .mockResolvedValueOnce('ADMIN') // actor check passes
        .mockResolvedValueOnce(null); // target not found

      const query = new GetUserActivityQuery('nonexistent-user', 50, 'admin-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Target user not found');
      expect(mockRepository.findUserActivity).not.toHaveBeenCalled();
    });
  });
});
