/**
 * GetProjectHandler Unit Tests
 *
 * Tests for getting project by ID/slug query handler with authorization.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import type { ProjectRepository, ProjectWithLanguages } from '../project.repository.js';
import { GetProjectHandler } from '../queries/get-project.handler.js';
import { GetProjectQuery } from '../queries/get-project.query.js';

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

describe('GetProjectHandler', () => {
  let handler: GetProjectHandler;
  let mockRepository: MockRepository;
  let mockAccessService: MockAccessService;

  const mockProject: ProjectWithLanguages = {
    id: 'proj-1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    defaultLanguage: 'en',
    activityRetentionDays: 90,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    languages: [
      { id: 'lang-1', code: 'en', name: 'English', isDefault: true },
      { id: 'lang-2', code: 'es', name: 'Spanish', isDefault: false },
    ],
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockAccessService = createMockAccessService();
    handler = new GetProjectHandler(
      mockRepository as unknown as ProjectRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should return project with role when authorized', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });

      const query = new GetProjectQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual({ project: mockProject, role: 'OWNER' });
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('proj-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
    });

    it('should work with slug as identifier', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'DEVELOPER' });

      const query = new GetProjectQuery('test-project', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.project.slug).toBe('test-project');
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('test-project');
    });

    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(null);

      const query = new GetProjectQuery('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const query = new GetProjectQuery('proj-1', 'unauthorized-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should return different roles correctly', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);

      // Test MANAGER role
      mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
      const query = new GetProjectQuery('proj-1', 'manager-user');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.role).toBe('MANAGER');
    });

    it('should include project with all languages', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'DEVELOPER' });

      const query = new GetProjectQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.project.languages).toHaveLength(2);
      expect(result.project.languages[0].code).toBe('en');
      expect(result.project.languages[0].isDefault).toBe(true);
    });
  });
});
