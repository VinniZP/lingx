/**
 * GetActivityChangesHandler Unit Tests
 *
 * Tests for activity changes query handler with authorization.
 * Returns 404 for both non-existent activities and unauthorized access
 * to prevent information disclosure.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AccessService } from '../../../access/access.service.js';
import type { ActivityRepository } from '../../activity.repository.js';
import { GetActivityChangesHandler } from '../get-activity-changes.handler.js';
import { GetActivityChangesQuery } from '../get-activity-changes.query.js';

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

describe('GetActivityChangesHandler', () => {
  let handler: GetActivityChangesHandler;
  let mockActivityRepository: MockActivityRepository;
  let mockAccessService: MockAccessService;

  const mockChangesResponse = {
    changes: [
      {
        id: 'change-1',
        activityId: 'activity-1',
        entityType: 'TRANSLATION',
        entityId: 'trans-1',
        keyName: 'greeting',
        language: 'en',
        oldValue: 'Hello',
        newValue: 'Hi there',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    nextCursor: undefined,
    total: 1,
  };

  beforeEach(() => {
    mockActivityRepository = createMockActivityRepository();
    mockAccessService = createMockAccessService();
    handler = new GetActivityChangesHandler(
      mockActivityRepository as unknown as ActivityRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should return activity changes when found and authorized', async () => {
      // Arrange
      mockActivityRepository.findById.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockActivityRepository.findActivityChanges.mockResolvedValue(mockChangesResponse);

      const query = new GetActivityChangesQuery('activity-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockChangesResponse);
      expect(mockActivityRepository.findById).toHaveBeenCalledWith('activity-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
      expect(mockActivityRepository.findActivityChanges).toHaveBeenCalledWith(
        'activity-1',
        undefined
      );
    });

    it('should pass pagination options to repository', async () => {
      // Arrange
      mockActivityRepository.findById.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockActivityRepository.findActivityChanges.mockResolvedValue(mockChangesResponse);

      const query = new GetActivityChangesQuery('activity-1', 'user-1', {
        limit: 50,
        cursor: 'prev-cursor',
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockChangesResponse);
      expect(mockActivityRepository.findActivityChanges).toHaveBeenCalledWith('activity-1', {
        limit: 50,
        cursor: 'prev-cursor',
      });
    });

    it('should throw NotFoundError when activity not found', async () => {
      // Arrange
      mockActivityRepository.findById.mockResolvedValue(null);

      const query = new GetActivityChangesQuery('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Activity not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockActivityRepository.findActivityChanges).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user is not project member (hides resource existence)', async () => {
      // Arrange
      mockActivityRepository.findById.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      const forbiddenError = Object.assign(new Error('Not authorized to access this project'), {
        code: 'FORBIDDEN',
        statusCode: 403,
      });
      mockAccessService.verifyProjectAccess.mockRejectedValue(forbiddenError);

      const query = new GetActivityChangesQuery('activity-1', 'unauthorized-user');

      // Act & Assert - Returns 404 instead of 403 to hide resource existence
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Activity not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockActivityRepository.findActivityChanges).not.toHaveBeenCalled();
    });

    it('should propagate non-ForbiddenError errors from AccessService', async () => {
      // Arrange
      mockActivityRepository.findById.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Database error'));

      const query = new GetActivityChangesQuery('activity-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database error');
    });

    it('should propagate errors from ActivityRepository', async () => {
      // Arrange
      mockActivityRepository.findById.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockActivityRepository.findActivityChanges.mockRejectedValue(new Error('Repository error'));

      const query = new GetActivityChangesQuery('activity-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Repository error');
    });
  });
});
