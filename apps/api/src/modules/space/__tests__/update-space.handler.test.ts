/**
 * UpdateSpaceHandler Unit Tests
 *
 * Tests for space update command handler.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import type { Space } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { UpdateSpaceCommand } from '../commands/update-space.command.js';
import { UpdateSpaceHandler } from '../commands/update-space.handler.js';
import { SpaceUpdatedEvent } from '../events/space-updated.event.js';
import type { SpaceRepository } from '../space.repository.js';

interface MockSpaceRepository {
  findById: Mock;
  findByProjectId: Mock;
  existsBySlugInProject: Mock;
  getProjectIdBySpaceId: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  exists: Mock;
}

interface MockProjectRepository {
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

interface MockEventBus {
  publish: Mock;
  publishAll: Mock;
}

function createMockSpaceRepository(): MockSpaceRepository {
  return {
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    existsBySlugInProject: vi.fn(),
    getProjectIdBySpaceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    exists: vi.fn(),
  };
}

function createMockProjectRepository(): MockProjectRepository {
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

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };
}

describe('UpdateSpaceHandler', () => {
  let handler: UpdateSpaceHandler;
  let mockSpaceRepository: MockSpaceRepository;
  let mockProjectRepository: MockProjectRepository;
  let mockEventBus: MockEventBus;

  const mockSpace: Space = {
    id: 'space-1',
    name: 'Test Space',
    slug: 'test-space',
    description: 'A test space',
    projectId: 'proj-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockSpaceRepository = createMockSpaceRepository();
    mockProjectRepository = createMockProjectRepository();
    mockEventBus = createMockEventBus();
    handler = new UpdateSpaceHandler(
      mockSpaceRepository as unknown as SpaceRepository,
      mockProjectRepository as unknown as import('../../project/project.repository.js').ProjectRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    // Happy path - update name
    it('should update space name', async () => {
      // Arrange
      const updatedSpace = { ...mockSpace, name: 'Updated Space Name' };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.update.mockResolvedValue(updatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        name: 'Updated Space Name',
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(updatedSpace);
      expect(mockSpaceRepository.getProjectIdBySpaceId).toHaveBeenCalledWith('space-1');
      expect(mockProjectRepository.getMemberRole).toHaveBeenCalledWith('proj-1', 'user-1');
      expect(mockSpaceRepository.update).toHaveBeenCalledWith('space-1', {
        name: 'Updated Space Name',
      });
    });

    // Happy path - update description
    it('should update space description', async () => {
      // Arrange
      const updatedSpace = { ...mockSpace, description: 'Updated description' };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('MANAGER');
      mockSpaceRepository.update.mockResolvedValue(updatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        description: 'Updated description',
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.description).toBe('Updated description');
      expect(mockSpaceRepository.update).toHaveBeenCalledWith('space-1', {
        description: 'Updated description',
      });
    });

    // Update both name and description
    it('should update both name and description', async () => {
      // Arrange
      const updatedSpace = {
        ...mockSpace,
        name: 'New Name',
        description: 'New description',
      };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.update.mockResolvedValue(updatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        name: 'New Name',
        description: 'New description',
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
    });

    // Space not found
    it('should throw NotFoundError when space does not exist', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue(null);

      const command = new UpdateSpaceCommand('nonexistent-space', 'user-1', {
        name: 'New Name',
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Space not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockSpaceRepository.update).not.toHaveBeenCalled();
    });

    // User not a member
    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue(null);

      const command = new UpdateSpaceCommand('space-1', 'non-member-user', {
        name: 'New Name',
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Not a member of this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockSpaceRepository.update).not.toHaveBeenCalled();
    });

    // Allow DEVELOPER role to update
    it('should allow DEVELOPER role to update space', async () => {
      // Arrange
      const updatedSpace = { ...mockSpace, name: 'Updated Name' };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('DEVELOPER');
      mockSpaceRepository.update.mockResolvedValue(updatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        name: 'Updated Name',
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.name).toBe('Updated Name');
    });

    // Event emission
    it('should emit SpaceUpdatedEvent after update', async () => {
      // Arrange
      const updatedSpace = { ...mockSpace, name: 'Updated Name' };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.update.mockResolvedValue(updatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        name: 'Updated Name',
      });

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(SpaceUpdatedEvent);
      expect(publishedEvent.space).toEqual(updatedSpace);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.changes).toEqual({ name: 'Updated Name' });
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });

    // Clear description (set to empty string)
    it('should allow clearing description', async () => {
      // Arrange
      const updatedSpace = { ...mockSpace, description: '' };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.update.mockResolvedValue(updatedSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        description: '',
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.description).toBe('');
      expect(mockSpaceRepository.update).toHaveBeenCalledWith('space-1', {
        description: '',
      });
    });

    // Repository error propagation
    it('should propagate repository errors', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.update.mockRejectedValue(new Error('Database connection lost'));

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        name: 'New Name',
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database connection lost');
    });

    // EventBus error propagation
    it('should propagate event bus errors', async () => {
      // Arrange
      const updatedSpace = { ...mockSpace, name: 'Updated Name' };
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.update.mockResolvedValue(updatedSpace);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus unavailable'));

      const command = new UpdateSpaceCommand('space-1', 'user-1', {
        name: 'Updated Name',
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Event bus unavailable');
    });

    // Empty input (no-op update)
    it('should handle update with no changes (empty input)', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.update.mockResolvedValue(mockSpace);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateSpaceCommand('space-1', 'user-1', {});

      // Act
      const result = await handler.execute(command);

      // Assert - should return unchanged space
      expect(result).toEqual(mockSpace);
      expect(mockSpaceRepository.update).toHaveBeenCalledWith('space-1', {});
      // Event is still emitted (documents the no-op)
      expect(mockEventBus.publish).toHaveBeenCalled();
      // Command's hasChanges should return false for empty input
      expect(command.hasChanges()).toBe(false);
    });
  });
});
