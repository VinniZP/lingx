/**
 * GetProjectActivitiesHandler Unit Tests
 *
 * Tests for project activities query handler with authorization.
 * Returns 404 for both non-existent projects and unauthorized access
 * to prevent information disclosure.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AccessService } from '../../../access/access.service.js';
import type { ActivityRepository } from '../../activity.repository.js';
import { GetProjectActivitiesHandler } from '../get-project-activities.handler.js';
import { GetProjectActivitiesQuery } from '../get-project-activities.query.js';

interface MockActivityRepository {
  findById: Mock;
  findUserActivities: Mock;
  findProjectActivities: Mock;
  findActivityChanges: Mock;
}

function createMockActivityRepository(): MockActivityRepository {
  return {
    findById: vi.fn(),
    findUserActivities: vi.fn(),
    findProjectActivities: vi.fn(),
    findActivityChanges: vi.fn(),
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

describe('GetProjectActivitiesHandler', () => {
  let handler: GetProjectActivitiesHandler;
  let mockActivityRepository: MockActivityRepository;
  let mockAccessService: MockAccessService;

  const mockActivitiesResponse = {
    activities: [
      {
        id: 'activity-1',
        projectId: 'proj-1',
        projectName: 'Test Project',
        branchId: 'branch-1',
        branchName: 'main',
        userId: 'user-1',
        userName: 'Test User',
        type: 'TRANSLATION_UPDATE',
        count: 5,
        metadata: { preview: [] },
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    nextCursor: 'cursor-123',
  };

  beforeEach(() => {
    mockActivityRepository = createMockActivityRepository();
    mockAccessService = createMockAccessService();
    handler = new GetProjectActivitiesHandler(
      mockActivityRepository as unknown as ActivityRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should return project activities when authorized', async () => {
      // Arrange
      mockActivityRepository.findProjectActivities.mockResolvedValue(mockActivitiesResponse);

      const query = new GetProjectActivitiesQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockActivitiesResponse);
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
      expect(mockActivityRepository.findProjectActivities).toHaveBeenCalledWith(
        'proj-1',
        undefined
      );
    });

    it('should pass pagination options to repository', async () => {
      // Arrange
      mockActivityRepository.findProjectActivities.mockResolvedValue(mockActivitiesResponse);

      const query = new GetProjectActivitiesQuery('proj-1', 'user-1', {
        limit: 20,
        cursor: 'prev-cursor',
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockActivitiesResponse);
      expect(mockActivityRepository.findProjectActivities).toHaveBeenCalledWith('proj-1', {
        limit: 20,
        cursor: 'prev-cursor',
      });
    });

    it('should throw NotFoundError when user is not project member (hides resource existence)', async () => {
      // Arrange
      const forbiddenError = Object.assign(new Error('Not authorized to access this project'), {
        code: 'FORBIDDEN',
        statusCode: 403,
      });
      mockAccessService.verifyProjectAccess.mockRejectedValue(forbiddenError);

      const query = new GetProjectActivitiesQuery('proj-1', 'unauthorized-user');

      // Act & Assert - Returns 404 instead of 403 to hide resource existence
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockActivityRepository.findProjectActivities).not.toHaveBeenCalled();
    });

    it('should propagate non-ForbiddenError errors from AccessService', async () => {
      // Arrange
      mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Database error'));

      const query = new GetProjectActivitiesQuery('proj-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database error');
    });

    it('should propagate errors from ActivityRepository', async () => {
      // Arrange
      mockActivityRepository.findProjectActivities.mockRejectedValue(new Error('Repository error'));

      const query = new GetProjectActivitiesQuery('proj-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Repository error');
    });

    it('should return empty activities when project has no activity', async () => {
      // Arrange
      const emptyResponse = { activities: [] };
      mockActivityRepository.findProjectActivities.mockResolvedValue(emptyResponse);

      const query = new GetProjectActivitiesQuery('proj-empty', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(emptyResponse);
      expect(mockActivityRepository.findProjectActivities).toHaveBeenCalledWith(
        'proj-empty',
        undefined
      );
    });
  });
});
