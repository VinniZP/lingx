/**
 * ProjectActivityHandler Unit Tests
 *
 * Tests for activity logging event handler.
 */

import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ActivityService } from '../../../services/activity.service.js';
import { ProjectCreatedEvent } from '../events/project-created.event.js';
import { ProjectDeletedEvent } from '../events/project-deleted.event.js';
import { ProjectUpdatedEvent } from '../events/project-updated.event.js';
import { ProjectActivityHandler } from '../handlers/project-activity.handler.js';
import type { ProjectWithLanguages } from '../project.repository.js';

interface MockActivityService {
  log: Mock;
}

function createMockActivityService(): MockActivityService {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

interface MockLogger {
  info: Mock;
  warn: Mock;
  error: Mock;
  debug: Mock;
  trace: Mock;
  fatal: Mock;
  child: Mock;
}

function createMockLogger(): MockLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

function createMockProject(): ProjectWithLanguages {
  return {
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
}

describe('ProjectActivityHandler', () => {
  let handler: ProjectActivityHandler;
  let mockActivityService: MockActivityService;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockActivityService = createMockActivityService();
    mockLogger = createMockLogger();
    handler = new ProjectActivityHandler(
      mockActivityService as unknown as ActivityService,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('handle ProjectCreatedEvent', () => {
    it('should log project_create activity', async () => {
      // Arrange
      const project = createMockProject();
      const event = new ProjectCreatedEvent(project, 'user-1');

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'project_create',
        projectId: 'proj-1',
        userId: 'user-1',
        metadata: {
          projectName: 'Test Project',
          languages: ['en', 'es'],
        },
        changes: [
          {
            entityType: 'project',
            entityId: 'proj-1',
            newValue: 'Test Project',
          },
        ],
      });
    });

    it('should include all language codes in metadata', async () => {
      // Arrange
      const project = createMockProject();
      project.languages = [
        { id: 'lang-1', code: 'en', name: 'English', isDefault: true },
        { id: 'lang-2', code: 'es', name: 'Spanish', isDefault: false },
        { id: 'lang-3', code: 'fr', name: 'French', isDefault: false },
      ];
      const event = new ProjectCreatedEvent(project, 'user-1');

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.metadata.languages).toEqual(['en', 'es', 'fr']);
    });
  });

  describe('handle ProjectUpdatedEvent', () => {
    it('should log project_settings activity', async () => {
      // Arrange
      const project = createMockProject();
      const event = new ProjectUpdatedEvent(project, 'user-1', ['name', 'description'], {
        name: 'Old Name',
        description: 'Old description',
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'project_settings',
        projectId: 'proj-1',
        userId: 'user-1',
        metadata: {
          changedFields: ['name', 'description'],
        },
        changes: [
          {
            entityType: 'project',
            entityId: 'proj-1',
            keyName: 'name',
            oldValue: 'Old Name',
            newValue: 'Test Project',
          },
          {
            entityType: 'project',
            entityId: 'proj-1',
            keyName: 'description',
            oldValue: 'Old description',
            newValue: 'A test project',
          },
        ],
      });
    });

    it('should handle single field change', async () => {
      // Arrange
      const project = createMockProject();
      const event = new ProjectUpdatedEvent(project, 'user-1', ['name'], { name: 'Old Name' });

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.changes).toHaveLength(1);
      expect(call.changes[0].keyName).toBe('name');
    });

    it('should handle undefined previous values', async () => {
      // Arrange
      const project = createMockProject();
      const event = new ProjectUpdatedEvent(project, 'user-1', ['description'], {
        description: undefined,
      });

      // Act
      await handler.handle(event);

      // Assert
      const call = mockActivityService.log.mock.calls[0][0];
      expect(call.changes[0].oldValue).toBe('');
    });
  });

  describe('handle ProjectDeletedEvent', () => {
    it('should log project_delete activity', async () => {
      // Arrange
      const event = new ProjectDeletedEvent('proj-1', 'Test Project', 'user-1');

      // Act
      await handler.handle(event);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledTimes(1);
      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'project_delete',
        projectId: 'proj-1',
        userId: 'user-1',
        metadata: {
          projectName: 'Test Project',
        },
        changes: [
          {
            entityType: 'project',
            entityId: 'proj-1',
            oldValue: 'Test Project',
          },
        ],
      });
    });
  });

  describe('handle unknown event', () => {
    it('should not throw for unknown event types', async () => {
      // Arrange
      const unknownEvent = {
        occurredAt: new Date(),
      };

      // Act & Assert - should not throw
      await expect(handler.handle(unknownEvent)).resolves.toBeUndefined();

      // Verify warning was logged via proper logger
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { eventName: 'Object', handler: 'ProjectActivityHandler' },
        'Received unknown event type: Object'
      );

      // Verify no activity was logged
      expect(mockActivityService.log).not.toHaveBeenCalled();
    });

    it('should not log activity for unknown event', async () => {
      // Arrange - create a fake event class
      class FakeEvent {
        occurredAt = new Date();
      }
      const unknownEvent = new FakeEvent();

      // Act
      await handler.handle(unknownEvent);

      // Assert
      expect(mockActivityService.log).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { eventName: 'FakeEvent', handler: 'ProjectActivityHandler' },
        'Received unknown event type: FakeEvent'
      );
    });
  });

  describe('error handling', () => {
    it('should catch and log activity service errors without throwing', async () => {
      // Arrange
      const project = createMockProject();
      const event = new ProjectCreatedEvent(project, 'user-1');
      mockActivityService.log.mockRejectedValue(new Error('Activity service unavailable'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          eventName: 'ProjectCreatedEvent',
          projectId: 'proj-1',
        }),
        'Failed to log project creation activity'
      );
    });

    it('should catch errors from update event logging', async () => {
      // Arrange
      const project = createMockProject();
      const event = new ProjectUpdatedEvent(project, 'user-1', ['name'], { name: 'Old' });
      mockActivityService.log.mockRejectedValue(new Error('Redis unavailable'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'ProjectUpdatedEvent',
          projectId: 'proj-1',
        }),
        'Failed to log project update activity'
      );
    });

    it('should catch errors from delete event logging', async () => {
      // Arrange
      const event = new ProjectDeletedEvent('proj-1', 'Test Project', 'user-1');
      mockActivityService.log.mockRejectedValue(new Error('Queue full'));

      // Act - should NOT throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'ProjectDeletedEvent',
          projectId: 'proj-1',
        }),
        'Failed to log project deletion activity'
      );
    });
  });
});
