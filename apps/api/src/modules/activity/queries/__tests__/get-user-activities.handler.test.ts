/**
 * GetUserActivitiesHandler Unit Tests
 *
 * Tests for user activities query handler.
 * Authorization is implicit - user can only see their own activities.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ActivityService } from '../../../../services/activity.service.js';
import { GetUserActivitiesHandler } from '../get-user-activities.handler.js';
import { GetUserActivitiesQuery } from '../get-user-activities.query.js';

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

describe('GetUserActivitiesHandler', () => {
  let handler: GetUserActivitiesHandler;
  let mockActivityService: MockActivityService;

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
    mockActivityService = createMockActivityService();
    handler = new GetUserActivitiesHandler(mockActivityService as unknown as ActivityService);
  });

  describe('execute', () => {
    it('should return user activities with default options', async () => {
      // Arrange
      mockActivityService.getUserActivities.mockResolvedValue(mockActivitiesResponse);

      const query = new GetUserActivitiesQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockActivitiesResponse);
      expect(mockActivityService.getUserActivities).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should pass pagination options to service', async () => {
      // Arrange
      mockActivityService.getUserActivities.mockResolvedValue(mockActivitiesResponse);

      const query = new GetUserActivitiesQuery('user-1', { limit: 20, cursor: 'prev-cursor' });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockActivitiesResponse);
      expect(mockActivityService.getUserActivities).toHaveBeenCalledWith('user-1', {
        limit: 20,
        cursor: 'prev-cursor',
      });
    });

    it('should return empty activities when user has no projects', async () => {
      // Arrange
      const emptyResponse = { activities: [] };
      mockActivityService.getUserActivities.mockResolvedValue(emptyResponse);

      const query = new GetUserActivitiesQuery('user-without-projects');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(emptyResponse);
      expect(mockActivityService.getUserActivities).toHaveBeenCalledWith(
        'user-without-projects',
        undefined
      );
    });

    it('should propagate service errors', async () => {
      // Arrange
      mockActivityService.getUserActivities.mockRejectedValue(new Error('Database error'));

      const query = new GetUserActivitiesQuery('user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database error');
    });
  });
});
