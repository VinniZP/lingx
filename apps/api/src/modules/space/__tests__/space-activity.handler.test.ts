/**
 * SpaceActivityHandler Unit Tests
 *
 * Tests for space activity logging event handler.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import type { Space } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { SpaceCreatedEvent } from '../events/space-created.event.js';
import { SpaceDeletedEvent } from '../events/space-deleted.event.js';
import { SpaceUpdatedEvent } from '../events/space-updated.event.js';
import { SpaceActivityHandler } from '../handlers/space-activity.handler.js';

interface MockActivityService {
  log: Mock;
}

interface MockLogger {
  error: Mock;
  warn: Mock;
  info: Mock;
}

function createMockActivityService(): MockActivityService {
  return {
    log: vi.fn(),
  };
}

function createMockLogger(): MockLogger {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
}

function createMockSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: 'space-1',
    name: 'Test Space',
    slug: 'test-space',
    description: 'A test space',
    projectId: 'project-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('SpaceActivityHandler', () => {
  let handler: SpaceActivityHandler;
  let mockActivityService: MockActivityService;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockActivityService = createMockActivityService();
    mockLogger = createMockLogger();
    handler = new SpaceActivityHandler(mockActivityService as never, mockLogger as never);
  });

  describe('SpaceCreatedEvent', () => {
    it('should log space_create activity with correct metadata', async () => {
      const space = createMockSpace();
      const event = new SpaceCreatedEvent(space, 'user-1');

      await handler.handle(event);

      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'space_create',
        projectId: 'project-1',
        userId: 'user-1',
        metadata: {
          spaceName: 'Test Space',
          spaceSlug: 'test-space',
        },
        changes: [
          {
            entityType: 'space',
            entityId: 'space-1',
            newValue: 'Test Space',
          },
        ],
      });
    });

    it('should handle activity service errors gracefully without throwing', async () => {
      const space = createMockSpace();
      const event = new SpaceCreatedEvent(space, 'user-1');
      const testError = new Error('Activity service unavailable');
      mockActivityService.log.mockRejectedValue(testError);

      // Should not throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: testError, eventName: 'SpaceCreatedEvent', spaceId: 'space-1' },
        'Failed to log space creation activity'
      );
    });
  });

  describe('SpaceUpdatedEvent', () => {
    it('should log space_update activity with changed fields', async () => {
      const space = createMockSpace({ name: 'Updated Space' });
      const changes = { name: 'Updated Space' };
      const event = new SpaceUpdatedEvent(space, 'user-1', changes);

      await handler.handle(event);

      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'space_update',
        projectId: 'project-1',
        userId: 'user-1',
        metadata: {
          spaceName: 'Updated Space',
          changedFields: ['name'],
        },
        changes: [
          {
            entityType: 'space',
            entityId: 'space-1',
            keyName: 'name',
            newValue: 'Updated Space',
          },
        ],
      });
    });

    it('should log multiple changed fields', async () => {
      const space = createMockSpace({
        name: 'Updated Space',
        description: 'Updated description',
      });
      const changes = { name: 'Updated Space', description: 'Updated description' };
      const event = new SpaceUpdatedEvent(space, 'user-1', changes);

      await handler.handle(event);

      expect(mockActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            changedFields: expect.arrayContaining(['name', 'description']),
          }),
          changes: expect.arrayContaining([
            expect.objectContaining({ keyName: 'name' }),
            expect.objectContaining({ keyName: 'description' }),
          ]),
        })
      );
    });

    it('should handle activity service errors gracefully without throwing', async () => {
      const space = createMockSpace();
      const event = new SpaceUpdatedEvent(space, 'user-1', { name: 'New Name' });
      const testError = new Error('Activity service unavailable');
      mockActivityService.log.mockRejectedValue(testError);

      // Should not throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: testError, eventName: 'SpaceUpdatedEvent', spaceId: 'space-1' },
        'Failed to log space update activity'
      );
    });
  });

  describe('SpaceDeletedEvent', () => {
    it('should log space_delete activity with spaceId', async () => {
      const event = new SpaceDeletedEvent('space-1', 'project-1', 'user-1');

      await handler.handle(event);

      expect(mockActivityService.log).toHaveBeenCalledWith({
        type: 'space_delete',
        projectId: 'project-1',
        userId: 'user-1',
        metadata: {
          spaceId: 'space-1',
        },
        changes: [
          {
            entityType: 'space',
            entityId: 'space-1',
          },
        ],
      });
    });

    it('should handle activity service errors gracefully without throwing', async () => {
      const event = new SpaceDeletedEvent('space-1', 'project-1', 'user-1');
      const testError = new Error('Activity service unavailable');
      mockActivityService.log.mockRejectedValue(testError);

      // Should not throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: testError, eventName: 'SpaceDeletedEvent', spaceId: 'space-1' },
        'Failed to log space deletion activity'
      );
    });
  });

  describe('unknown event types', () => {
    it('should warn on unknown event types', async () => {
      // Create a fake event with an unknown constructor name
      const fakeEvent = {
        constructor: { name: 'UnknownEvent' },
        occurredAt: new Date(),
      };

      await handler.handle(fakeEvent as never);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { eventName: 'UnknownEvent', handler: 'SpaceActivityHandler' },
        'Received unknown event type: UnknownEvent'
      );
      expect(mockActivityService.log).not.toHaveBeenCalled();
    });
  });
});
