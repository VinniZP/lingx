/**
 * GetProjectTreeHandler Unit Tests
 *
 * Tests for getting project navigation tree query handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { ProjectRepository, ProjectTree } from '../project.repository.js';
import { GetProjectTreeHandler } from '../queries/get-project-tree.handler.js';
import { GetProjectTreeQuery } from '../queries/get-project-tree.query.js';

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

describe('GetProjectTreeHandler', () => {
  let handler: GetProjectTreeHandler;
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

  const mockTree: ProjectTree = {
    id: 'proj-1',
    name: 'Test Project',
    slug: 'test-project',
    spaces: [
      {
        id: 'space-1',
        name: 'Default',
        slug: 'default',
        branches: [
          {
            id: 'branch-1',
            name: 'main',
            slug: 'main',
            isDefault: true,
            keyCount: 50,
          },
          {
            id: 'branch-2',
            name: 'develop',
            slug: 'develop',
            isDefault: false,
            keyCount: 30,
          },
        ],
      },
      {
        id: 'space-2',
        name: 'Mobile',
        slug: 'mobile',
        branches: [
          {
            id: 'branch-3',
            name: 'main',
            slug: 'main',
            isDefault: true,
            keyCount: 20,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockAccessService = createMockAccessService();
    handler = new GetProjectTreeHandler(
      mockRepository as unknown as ProjectRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should return project tree when authorized', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getTree.mockResolvedValue(mockTree);

      const query = new GetProjectTreeQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockTree);
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('proj-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
      expect(mockRepository.getTree).toHaveBeenCalledWith('proj-1');
    });

    it('should work with slug as identifier', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getTree.mockResolvedValue(mockTree);

      const query = new GetProjectTreeQuery('test-project', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.slug).toBe('test-project');
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('test-project');
    });

    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(null);

      const query = new GetProjectTreeQuery('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockRepository.getTree).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const query = new GetProjectTreeQuery('proj-1', 'unauthorized-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockRepository.getTree).not.toHaveBeenCalled();
    });

    it('should return tree with spaces and branches', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getTree.mockResolvedValue(mockTree);

      const query = new GetProjectTreeQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.spaces).toHaveLength(2);
      expect(result.spaces[0].branches).toHaveLength(2);
      expect(result.spaces[0].branches[0].isDefault).toBe(true);
    });

    it('should include key counts for branches', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getTree.mockResolvedValue(mockTree);

      const query = new GetProjectTreeQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.spaces[0].branches[0].keyCount).toBe(50);
      expect(result.spaces[0].branches[1].keyCount).toBe(30);
    });

    it('should throw NotFoundError when getTree returns null', async () => {
      // Arrange - project exists but tree computation returns null
      // This could happen in edge cases like data corruption
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockRepository.getTree.mockResolvedValue(null);

      const query = new GetProjectTreeQuery('proj-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });
});
