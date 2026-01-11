/**
 * DeleteSpaceHandler Unit Tests
 *
 * Tests for space deletion command handler.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteSpaceCommand } from '../commands/delete-space.command.js';
import { DeleteSpaceHandler } from '../commands/delete-space.handler.js';
import { SpaceDeletedEvent } from '../events/space-deleted.event.js';
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

describe('DeleteSpaceHandler', () => {
  let handler: DeleteSpaceHandler;
  let mockSpaceRepository: MockSpaceRepository;
  let mockProjectRepository: MockProjectRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockSpaceRepository = createMockSpaceRepository();
    mockProjectRepository = createMockProjectRepository();
    mockEventBus = createMockEventBus();
    handler = new DeleteSpaceHandler(
      mockSpaceRepository as unknown as SpaceRepository,
      mockProjectRepository as unknown as import('../../project/project.repository.js').ProjectRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    // Happy path - OWNER role
    it('should delete space with OWNER role', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteSpaceCommand('space-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockSpaceRepository.getProjectIdBySpaceId).toHaveBeenCalledWith('space-1');
      expect(mockProjectRepository.getMemberRole).toHaveBeenCalledWith('proj-1', 'user-1');
      expect(mockSpaceRepository.delete).toHaveBeenCalledWith('space-1');
    });

    // Happy path - MANAGER role
    it('should delete space with MANAGER role', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('MANAGER');
      mockSpaceRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteSpaceCommand('space-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockSpaceRepository.delete).toHaveBeenCalledWith('space-1');
    });

    // Space not found
    it('should throw NotFoundError when space does not exist', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue(null);

      const command = new DeleteSpaceCommand('nonexistent-space', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Space not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockSpaceRepository.delete).not.toHaveBeenCalled();
    });

    // User not a member
    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue(null);

      const command = new DeleteSpaceCommand('space-1', 'non-member-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Not a member of this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockSpaceRepository.delete).not.toHaveBeenCalled();
    });

    // DEVELOPER role - forbidden
    it('should throw ForbiddenError when user has DEVELOPER role', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('DEVELOPER');

      const command = new DeleteSpaceCommand('space-1', 'developer-user');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Requires manager or owner role',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockSpaceRepository.delete).not.toHaveBeenCalled();
    });

    // Event emission
    it('should emit SpaceDeletedEvent after deletion', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteSpaceCommand('space-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(SpaceDeletedEvent);
      expect(publishedEvent.spaceId).toBe('space-1');
      expect(publishedEvent.projectId).toBe('proj-1');
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });

    // Repository error propagation
    it('should propagate repository errors', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.delete.mockRejectedValue(new Error('Database connection lost'));

      const command = new DeleteSpaceCommand('space-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database connection lost');
    });

    // EventBus error propagation
    it('should propagate event bus errors', async () => {
      // Arrange
      mockSpaceRepository.getProjectIdBySpaceId.mockResolvedValue('proj-1');
      mockProjectRepository.getMemberRole.mockResolvedValue('OWNER');
      mockSpaceRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus unavailable'));

      const command = new DeleteSpaceCommand('space-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Event bus unavailable');
    });
  });
});
