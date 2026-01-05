/**
 * DeleteEnvironmentHandler Unit Tests
 *
 * Tests for environment deletion command handler with authorization.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EnvironmentDeletedEvent } from '../../events/environment-deleted.event.js';
import { DeleteEnvironmentCommand } from '../delete-environment.command.js';
import { DeleteEnvironmentHandler } from '../delete-environment.handler.js';
// Error classes not imported - using toMatchObject for assertions
import type { AccessService } from '../../../../services/access.service.js';
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

interface MockAccessService {
  verifyProjectAccess: Mock;
  verifyBranchAccess: Mock;
  verifyTranslationAccess: Mock;
  verifyKeyAccess: Mock;
}

function createMockAccessService(): MockAccessService {
  return {
    verifyProjectAccess: vi.fn().mockResolvedValue({ role: 'OWNER' }),
    verifyBranchAccess: vi.fn(),
    verifyTranslationAccess: vi.fn(),
    verifyKeyAccess: vi.fn(),
  };
}

describe('DeleteEnvironmentHandler', () => {
  let handler: DeleteEnvironmentHandler;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;
  let mockAccessService: MockAccessService;

  const mockExistingEnvironment = {
    id: 'env-1',
    name: 'Production',
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

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    mockAccessService = createMockAccessService();
    handler = new DeleteEnvironmentHandler(
      mockRepository as unknown as EnvironmentRepository,
      mockEventBus as unknown as IEventBus,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should delete environment when it exists', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteEnvironmentCommand('env-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith('env-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1', [
        'MANAGER',
        'OWNER',
      ]);
      expect(mockRepository.delete).toHaveBeenCalledWith('env-1');
    });

    it('should throw NotFoundError when environment does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const command = new DeleteEnvironmentCommand('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Environment not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks required role', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Insufficient permissions for this operation',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const command = new DeleteEnvironmentCommand('env-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Insufficient permissions for this operation',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should publish EnvironmentDeletedEvent with correct data', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteEnvironmentCommand('env-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(EnvironmentDeletedEvent);
      expect(publishedEvent.environmentId).toBe('env-1');
      expect(publishedEvent.environmentName).toBe('Production');
      expect(publishedEvent.projectId).toBe('proj-1');
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should return void on successful deletion', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new DeleteEnvironmentCommand('env-1', 'user-1');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should delete before publishing event', async () => {
      // Arrange
      const callOrder: string[] = [];
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.delete.mockImplementation(async () => {
        callOrder.push('delete');
      });
      mockEventBus.publish.mockImplementation(async () => {
        callOrder.push('publish');
      });

      const command = new DeleteEnvironmentCommand('env-1', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(callOrder).toEqual(['delete', 'publish']);
    });
  });
});
