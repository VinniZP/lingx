/**
 * GetSpaceStatsHandler Unit Tests
 *
 * Tests for getting space statistics query handler.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { GetSpaceStatsHandler } from '../queries/get-space-stats.handler.js';
import { GetSpaceStatsQuery } from '../queries/get-space-stats.query.js';
import type { SpaceRepository, SpaceStats } from '../space.repository.js';

interface MockSpaceRepository {
  findById: Mock;
  findByProjectId: Mock;
  existsBySlugInProject: Mock;
  getProjectIdBySpaceId: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  exists: Mock;
}

interface MockProjectRepository {
  findById: Mock;
  findBySlug: Mock;
  findByIdOrSlug: Mock;
  existsBySlug: Mock;
  getMemberRole: Mock;
  checkMembership: Mock;
  findByUserIdWithStats: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  getTree: Mock;
}

function createMockSpaceRepository(): MockSpaceRepository {
  return {
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    existsBySlugInProject: vi.fn(),
    getProjectIdBySpaceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    exists: vi.fn(),
  };
}

function createMockProjectRepository(): MockProjectRepository {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByIdOrSlug: vi.fn(),
    existsBySlug: vi.fn(),
    getMemberRole: vi.fn(),
    checkMembership: vi.fn(),
    findByUserIdWithStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    getTree: vi.fn(),
  };
}

describe('GetSpaceStatsHandler', () => {
  let handler: GetSpaceStatsHandler;
  let mockSpaceRepository: MockSpaceRepository;
  let mockProjectRepository: MockProjectRepository;

  const mockSpaceStats: SpaceStats = {
    id: 'space-1',
    name: 'Test Space',
    branches: 2,
    totalKeys: 10,
    translationsByLanguage: {
      en: { translated: 10, total: 10, percentage: 100 },
      es: { translated: 8, total: 10, percentage: 80 },
      fr: { translated: 5, total: 10, percentage: 50 },
    },
  };

  beforeEach(() => {
    mockSpaceRepository = createMockSpaceRepository();
    mockProjectRepository = createMockProjectRepository();
    handler = new GetSpaceStatsHandler(
      mockSpaceRepository as unknown as SpaceRepository,
      mockProjectRepository as unknown as import('../../project/project.repository.js').ProjectRepository
    );
  });

  describe('execute', () => {
    // Happy path
    it('should return space statistics', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.getStats.mockResolvedValue(mockSpaceStats);

      const query = new GetSpaceStatsQuery('space-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockSpaceStats);
      expect(mockSpaceRepository.getProjectIdBySpaceId).toHaveBeenCalledWith('space-1');
      expect(mockProjectRepository.checkMembership).toHaveBeenCalledWith('proj-1', 'user-1');
      expect(mockSpaceRepository.getStats).toHaveBeenCalledWith('space-1');
    });

    // Space not found
    it('should throw NotFoundError when space does not exist', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue(null);

      const query = new GetSpaceStatsQuery('nonexistent-space', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Space not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockSpaceRepository.getStats).not.toHaveBeenCalled();
    });

    // User not a member
    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.checkMembership.mockResolvedValue(false);

      const query = new GetSpaceStatsQuery('space-1', 'non-member-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Not a member of this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockSpaceRepository.getStats).not.toHaveBeenCalled();
    });

    // Empty stats (no keys)
    it('should handle spaces with no keys', async () => {
      // Arrange
      const emptyStats: SpaceStats = {
        id: 'space-1',
        name: 'Empty Space',
        branches: 1,
        totalKeys: 0,
        translationsByLanguage: {
          en: { translated: 0, total: 0, percentage: 0 },
        },
      };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.getStats.mockResolvedValue(emptyStats);

      const query = new GetSpaceStatsQuery('space-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.totalKeys).toBe(0);
      expect(result.translationsByLanguage.en.percentage).toBe(0);
    });

    // Stats returned as null (space deleted between checks)
    it('should throw NotFoundError when stats returns null', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.getStats.mockResolvedValue(null);

      const query = new GetSpaceStatsQuery('space-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Space not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });

    // Repository error propagation
    it('should propagate repository errors', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.getStats.mockRejectedValue(new Error('Database connection lost'));

      const query = new GetSpaceStatsQuery('space-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database connection lost');
    });
  });
});
