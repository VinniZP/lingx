/**
 * GetActivityChangesHandler Unit Tests
 *
 * Tests for activity changes query handler with authorization.
 * Returns 404 for both non-existent activities and unauthorized access
 * to prevent information disclosure.
 */

import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AccessService } from '../../../../services/access.service.js';
import type { ActivityService } from '../../../../services/activity.service.js';
import { GetActivityChangesHandler } from '../get-activity-changes.handler.js';
import { GetActivityChangesQuery } from '../get-activity-changes.query.js';

interface MockActivityService {
  log: Mock;
  getUserActivities: Mock;
  getProjectActivities: Mock;
  getActivityChanges: Mock;
}

function createMockActivityService(): MockActivityService {
  return {
    log: vi.fn(),
    getUserActivities: vi.fn(),
    getProjectActivities: vi.fn(),
    getActivityChanges: vi.fn(),
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

interface MockPrisma {
  activity: {
    findUnique: Mock;
  };
}

function createMockPrisma(): MockPrisma {
  return {
    activity: {
      findUnique: vi.fn(),
    },
  };
}

describe('GetActivityChangesHandler', () => {
  let handler: GetActivityChangesHandler;
  let mockActivityService: MockActivityService;
  let mockAccessService: MockAccessService;
  let mockPrisma: MockPrisma;

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
    mockActivityService = createMockActivityService();
    mockAccessService = createMockAccessService();
    mockPrisma = createMockPrisma();
    handler = new GetActivityChangesHandler(
      mockActivityService as unknown as ActivityService,
      mockAccessService as unknown as AccessService,
      mockPrisma as unknown as PrismaClient
    );
  });

  describe('execute', () => {
    it('should return activity changes when found and authorized', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockActivityService.getActivityChanges.mockResolvedValue(mockChangesResponse);

      const query = new GetActivityChangesQuery('activity-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockChangesResponse);
      expect(mockPrisma.activity.findUnique).toHaveBeenCalledWith({
        where: { id: 'activity-1' },
        select: { projectId: true },
      });
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
      expect(mockActivityService.getActivityChanges).toHaveBeenCalledWith('activity-1', undefined);
    });

    it('should pass pagination options to service', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockActivityService.getActivityChanges.mockResolvedValue(mockChangesResponse);

      const query = new GetActivityChangesQuery('activity-1', 'user-1', {
        limit: 50,
        cursor: 'prev-cursor',
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockChangesResponse);
      expect(mockActivityService.getActivityChanges).toHaveBeenCalledWith('activity-1', {
        limit: 50,
        cursor: 'prev-cursor',
      });
    });

    it('should throw NotFoundError when activity not found', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      const query = new GetActivityChangesQuery('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Activity not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockActivityService.getActivityChanges).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user is not project member (hides resource existence)', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue({
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

      expect(mockActivityService.getActivityChanges).not.toHaveBeenCalled();
    });

    it('should propagate non-ForbiddenError errors from AccessService', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Database error'));

      const query = new GetActivityChangesQuery('activity-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database error');
    });

    it('should propagate errors from ActivityService', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: 'activity-1',
        projectId: 'proj-1',
      });
      mockActivityService.getActivityChanges.mockRejectedValue(new Error('Service error'));

      const query = new GetActivityChangesQuery('activity-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Service error');
    });
  });
});
