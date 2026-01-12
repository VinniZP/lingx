/**
 * GetDashboardStatsHandler Unit Tests
 *
 * Tests for getting dashboard statistics query handler.
 */

import type { DashboardStats } from '@lingx/shared';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { DashboardRepository } from '../dashboard.repository.js';
import { GetDashboardStatsHandler } from '../queries/get-dashboard-stats.handler.js';
import { GetDashboardStatsQuery } from '../queries/get-dashboard-stats.query.js';

interface MockRepository {
  getStatsForUser: Mock;
}

function createMockRepository(): MockRepository {
  return {
    getStatsForUser: vi.fn(),
  };
}

function createHandler(mockRepository: MockRepository): GetDashboardStatsHandler {
  return new GetDashboardStatsHandler(mockRepository as unknown as DashboardRepository);
}

describe('GetDashboardStatsHandler', () => {
  let handler: GetDashboardStatsHandler;
  let mockRepository: MockRepository;

  const mockStatsWithProjects: DashboardStats = {
    totalProjects: 3,
    totalKeys: 150,
    totalLanguages: 4,
    completionRate: 0.75,
    translatedKeys: 120,
    totalTranslations: 450,
    pendingApprovalCount: 25,
  };

  const mockStatsEmpty: DashboardStats = {
    totalProjects: 0,
    totalKeys: 0,
    totalLanguages: 0,
    completionRate: 0,
    translatedKeys: 0,
    totalTranslations: 0,
    pendingApprovalCount: 0,
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    handler = createHandler(mockRepository);
  });

  describe('execute', () => {
    it('should return dashboard stats for user with projects', async () => {
      // Arrange
      mockRepository.getStatsForUser.mockResolvedValue(mockStatsWithProjects);
      const query = new GetDashboardStatsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockStatsWithProjects);
      expect(mockRepository.getStatsForUser).toHaveBeenCalledWith('user-1');
      expect(mockRepository.getStatsForUser).toHaveBeenCalledTimes(1);
    });

    it('should return zero stats for user with no projects', async () => {
      // Arrange
      mockRepository.getStatsForUser.mockResolvedValue(mockStatsEmpty);
      const query = new GetDashboardStatsQuery('user-no-projects');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockStatsEmpty);
      expect(result.totalProjects).toBe(0);
      expect(result.totalKeys).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('should include all required fields in response', async () => {
      // Arrange
      mockRepository.getStatsForUser.mockResolvedValue(mockStatsWithProjects);
      const query = new GetDashboardStatsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert - verify all required DashboardStats fields are present
      expect(result).toHaveProperty('totalProjects');
      expect(result).toHaveProperty('totalKeys');
      expect(result).toHaveProperty('totalLanguages');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('translatedKeys');
      expect(result).toHaveProperty('totalTranslations');
      expect(result).toHaveProperty('pendingApprovalCount');
    });

    it('should pass correct userId to repository', async () => {
      // Arrange
      mockRepository.getStatsForUser.mockResolvedValue(mockStatsEmpty);
      const userId = 'specific-user-id-123';
      const query = new GetDashboardStatsQuery(userId);

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.getStatsForUser).toHaveBeenCalledWith(userId);
    });

    it('should return stats with correct numeric types', async () => {
      // Arrange
      mockRepository.getStatsForUser.mockResolvedValue(mockStatsWithProjects);
      const query = new GetDashboardStatsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert - verify numeric types
      expect(typeof result.totalProjects).toBe('number');
      expect(typeof result.totalKeys).toBe('number');
      expect(typeof result.totalLanguages).toBe('number');
      expect(typeof result.completionRate).toBe('number');
      expect(typeof result.translatedKeys).toBe('number');
      expect(typeof result.totalTranslations).toBe('number');
      expect(typeof result.pendingApprovalCount).toBe('number');
    });

    it('should handle completion rate between 0 and 1', async () => {
      // Arrange
      const statsPartialCompletion: DashboardStats = {
        ...mockStatsWithProjects,
        completionRate: 0.5,
      };
      mockRepository.getStatsForUser.mockResolvedValue(statsPartialCompletion);
      const query = new GetDashboardStatsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.completionRate).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    it('should propagate database errors from repository', async () => {
      // Arrange
      const dbError = new Error('Database connection lost');
      mockRepository.getStatsForUser.mockRejectedValue(dbError);
      const query = new GetDashboardStatsQuery('user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database connection lost');
      expect(mockRepository.getStatsForUser).toHaveBeenCalledWith('user-1');
    });

    it('should propagate repository errors with context', async () => {
      // Arrange
      const contextualError = new Error(
        'Failed to fetch dashboard statistics for user user-1 across 5 projects: Query timeout'
      );
      mockRepository.getStatsForUser.mockRejectedValue(contextualError);
      const query = new GetDashboardStatsQuery('user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Failed to fetch dashboard statistics');
    });

    it('should handle non-Error rejections', async () => {
      // Arrange
      mockRepository.getStatsForUser.mockRejectedValue('Unknown failure');
      const query = new GetDashboardStatsQuery('user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toBe('Unknown failure');
    });

    it('should not catch and swallow errors silently', async () => {
      // Arrange
      const error = new Error('Unexpected error');
      mockRepository.getStatsForUser.mockRejectedValue(error);
      const query = new GetDashboardStatsQuery('user-1');

      // Act & Assert - verify error is propagated, not swallowed
      let caught = false;
      try {
        await handler.execute(query);
      } catch {
        caught = true;
      }
      expect(caught).toBe(true);
    });
  });
});
