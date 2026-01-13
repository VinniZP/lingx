/**
 * GetProjectActivityHandler Unit Tests
 *
 * Tests for getting project activity feed query handler.
 */

import type { ActivityListResponse } from '@lingx/shared';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ActivityService } from '../../../services/activity.service.js';
import type { AccessService } from '../../access/access.service.js';
import type { ProjectRepository } from '../project.repository.js';
import { GetProjectActivityHandler } from '../queries/get-project-activity.handler.js';
import { GetProjectActivityQuery } from '../queries/get-project-activity.query.js';

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

interface MockActivityService {
  log: Mock;
  getProjectActivities: Mock;
  getUserActivities: Mock;
  getActivityChanges: Mock;
}

function createMockActivityService(): MockActivityService {
  return {
    log: vi.fn(),
    getProjectActivities: vi.fn(),
    getUserActivities: vi.fn(),
    getActivityChanges: vi.fn(),
  };
}

describe('GetProjectActivityHandler', () => {
  let handler: GetProjectActivityHandler;
  let mockRepository: MockRepository;
  let mockAccessService: MockAccessService;
  let mockActivityService: MockActivityService;

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

  const mockActivityResponse: ActivityListResponse = {
    activities: [
      {
        id: 'act-1',
        projectId: 'proj-1',
        projectName: 'Test Project',
        branchId: 'branch-1',
        branchName: 'main',
        userId: 'user-1',
        userName: 'Test User',
        type: 'translation_update',
        count: 1,
        metadata: {},
        createdAt: new Date('2024-01-02').toISOString(),
      },
      {
        id: 'act-2',
        projectId: 'proj-1',
        projectName: 'Test Project',
        branchId: null,
        userId: 'user-1',
        userName: 'Test User',
        type: 'key_create',
        count: 5,
        metadata: {},
        createdAt: new Date('2024-01-01').toISOString(),
      },
    ],
    nextCursor: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockAccessService = createMockAccessService();
    mockActivityService = createMockActivityService();
    handler = new GetProjectActivityHandler(
      mockRepository as unknown as ProjectRepository,
      mockAccessService as unknown as AccessService,
      mockActivityService as unknown as ActivityService
    );
  });

  describe('execute', () => {
    it('should return project activities when authorized', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockActivityService.getProjectActivities.mockResolvedValue(mockActivityResponse);

      const query = new GetProjectActivityQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockActivityResponse);
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('proj-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
      expect(mockActivityService.getProjectActivities).toHaveBeenCalledWith('proj-1', {
        limit: undefined,
        cursor: undefined,
      });
    });

    it('should pass limit and cursor options', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockActivityService.getProjectActivities.mockResolvedValue(mockActivityResponse);

      const query = new GetProjectActivityQuery('proj-1', 'user-1', 20, 'cursor-123');

      // Act
      await handler.execute(query);

      // Assert
      expect(mockActivityService.getProjectActivities).toHaveBeenCalledWith('proj-1', {
        limit: 20,
        cursor: 'cursor-123',
      });
    });

    it('should work with slug as identifier', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockActivityService.getProjectActivities.mockResolvedValue(mockActivityResponse);

      const query = new GetProjectActivityQuery('test-project', 'user-1');

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findByIdOrSlug).toHaveBeenCalledWith('test-project');
    });

    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(null);

      const query = new GetProjectActivityQuery('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockActivityService.getProjectActivities).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const query = new GetProjectActivityQuery('proj-1', 'unauthorized-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Not authorized to access this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockActivityService.getProjectActivities).not.toHaveBeenCalled();
    });

    it('should return activities with user info', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockActivityService.getProjectActivities.mockResolvedValue(mockActivityResponse);

      const query = new GetProjectActivityQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.activities).toHaveLength(2);
      expect(result.activities[0].userName).toBe('Test User');
    });

    it('should return nextCursor for pagination', async () => {
      // Arrange
      mockRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockActivityService.getProjectActivities.mockResolvedValue(mockActivityResponse);

      const query = new GetProjectActivityQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.nextCursor).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
