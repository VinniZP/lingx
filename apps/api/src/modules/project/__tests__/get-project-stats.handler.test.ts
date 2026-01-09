/**
 * GetProjectStatsHandler Unit Tests
 *
 * Tests for getting project statistics query handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { ProjectRepository, ProjectStats } from '../project.repository.js';
import { GetProjectStatsHandler } from '../queries/get-project-stats.handler.js';
import { GetProjectStatsQuery } from '../queries/get-project-stats.query.js';

interface MockRepository {
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

function createMockRepository(): MockRepository {
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

interface MockAccessService {
  verifyProjectAccess: Mock;
  verifyBranchAccess: Mock;
  verifyTranslationAccess: Mock;
  verifyKeyAccess: Mock;
}

function createMockAccessService(): MockAccessService {
  return {
    verifyProjectAccess: vi.fn().mockResolvedValue({ role: 'DEVELOPER' }),
    verifyBranchAccess: vi.fn(),
    verifyTranslationAccess: vi.fn(),
    verifyKeyAccess: vi.fn(),
  };
}

describe('GetProjectStatsHandler', () => {
  let handler: GetProjectStatsHandler;
  let mockRepository: MockRepository;
  let mockAccessService: MockAccessService;

  const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    defaultLanguage: 'en',
    activityRetentionDays: 90,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    languages: [],
  };

  const mockStats: ProjectStats = {
    id: 'proj-1',
    name: 'Test Project',
    spaces: 2,
    totalKeys: 100,
    translationsByLanguage: {
      en: { translated: 100, total: 100, percentage: 100 },
      es: { translated: 75, total: 100, percentage: 75 },
    },
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockAccessService = createMockAccessService();
    handler = new GetProjectStatsHandler(
      mockRepository as unknown as ProjectRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should return project stats when authorized', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getStats.mockResolvedValue(mockStats);

      const query = new GetProjectStatsQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('proj-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
      expect(mockRepository.getStats).toHaveBeenCalledWith('proj-1');
    });

    it('should work with slug as identifier', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getStats.mockResolvedValue(mockStats);

      const query = new GetProjectStatsQuery('test-project', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.name).toBe('Test Project');
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('test-project');
    });

    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(null);

      const query = new GetProjectStatsQuery('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockRepository.getStats).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const query = new GetProjectStatsQuery('proj-1', 'unauthorized-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockRepository.getStats).not.toHaveBeenCalled();
    });

    it('should include translation stats for all languages', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getStats.mockResolvedValue(mockStats);

      const query = new GetProjectStatsQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.translationsByLanguage).toBeDefined();
      expect(result.translationsByLanguage.en.percentage).toBe(100);
      expect(result.translationsByLanguage.es.percentage).toBe(75);
    });

    it('should include space count', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getStats.mockResolvedValue(mockStats);

      const query = new GetProjectStatsQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.spaces).toBe(2);
    });

    it('should throw NotFoundError when getStats returns null', async () => {
      // Arrange - project exists but stats computation returns null
      // This could happen in edge cases like data corruption
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getStats.mockResolvedValue(null);

      const query = new GetProjectStatsQuery('proj-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });
});
