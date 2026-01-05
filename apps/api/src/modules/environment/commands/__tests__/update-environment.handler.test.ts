/**
 * UpdateEnvironmentHandler Unit Tests
 *
 * Tests for environment update command handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EnvironmentUpdatedEvent } from '../../events/environment-updated.event.js';
import { UpdateEnvironmentCommand } from '../update-environment.command.js';
import { UpdateEnvironmentHandler } from '../update-environment.handler.js';
// Error classes not imported - using toMatchObject for assertions
import type { IEventBus } from '../../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../../environment.repository.js';

interface MockRepository {
  findById: Mock;
  findByProjectId: Mock;
  findByProjectAndSlug: Mock;
  findBranchById: Mock;
  projectExists: Mock;
  create: Mock;
  update: Mock;
  switchBranch: Mock;
  delete: Mock;
}

function createMockRepository(): MockRepository {
  return {
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    findByProjectAndSlug: vi.fn(),
    findBranchById: vi.fn(),
    projectExists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    switchBranch: vi.fn(),
    delete: vi.fn(),
  };
}

interface MockEventBus {
  publish: Mock;
  publishAll: Mock;
}

function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };
}

describe('UpdateEnvironmentHandler', () => {
  let handler: UpdateEnvironmentHandler;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  const mockExistingEnvironment = {
    id: 'env-1',
    name: 'Original Name',
    slug: 'production',
    projectId: 'proj-1',
    branchId: 'branch-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    branch: {
      id: 'branch-1',
      name: 'main',
      slug: 'main',
      spaceId: 'space-1',
      space: {
        id: 'space-1',
        name: 'Default Space',
        slug: 'default',
      },
    },
  };

  const mockUpdatedEnvironment = {
    ...mockExistingEnvironment,
    name: 'Updated Name',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new UpdateEnvironmentHandler(
      mockRepository as unknown as EnvironmentRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('execute', () => {
    it('should update environment name when environment exists', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.update.mockResolvedValue(mockUpdatedEnvironment);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateEnvironmentCommand('env-1', 'Updated Name');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(mockUpdatedEnvironment);
      expect(mockRepository.findById).toHaveBeenCalledWith('env-1');
      expect(mockRepository.update).toHaveBeenCalledWith('env-1', {
        name: 'Updated Name',
      });
    });

    it('should throw NotFoundError when environment does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const command = new UpdateEnvironmentCommand('non-existent', 'Updated Name');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Environment not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should publish EnvironmentUpdatedEvent with previous name', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.update.mockResolvedValue(mockUpdatedEnvironment);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateEnvironmentCommand('env-1', 'Updated Name');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(EnvironmentUpdatedEvent);
      expect(publishedEvent.environment).toEqual(mockUpdatedEnvironment);
      expect(publishedEvent.previousName).toBe('Original Name');
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should update with undefined name when not provided', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.update.mockResolvedValue(mockExistingEnvironment);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new UpdateEnvironmentCommand('env-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith('env-1', {
        name: undefined,
      });
    });
  });
});
