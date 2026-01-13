/**
 * SwitchBranchHandler Unit Tests
 *
 * Tests for environment branch switching command handler with authorization.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { BranchSwitchedEvent } from '../../events/branch-switched.event.js';
import { SwitchBranchCommand } from '../switch-branch.command.js';
import { SwitchBranchHandler } from '../switch-branch.handler.js';
// Error classes not imported - using toMatchObject for assertions
import type { IEventBus } from '../../../../shared/cqrs/index.js';
import type { AccessService } from '../../../access/access.service.js';
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

describe('SwitchBranchHandler', () => {
  let handler: SwitchBranchHandler;
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

  const mockNewBranch = {
    id: 'branch-2',
    name: 'feature-x',
    slug: 'feature-x',
    space: {
      id: 'space-1',
      name: 'Default Space',
      slug: 'default',
      projectId: 'proj-1', // Same project
    },
  };

  const mockSwitchedEnvironment = {
    ...mockExistingEnvironment,
    branchId: 'branch-2',
    branch: {
      id: 'branch-2',
      name: 'feature-x',
      slug: 'feature-x',
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
    handler = new SwitchBranchHandler(
      mockRepository as unknown as EnvironmentRepository,
      mockEventBus as unknown as IEventBus,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should switch environment branch when all validations pass', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.findBranchById.mockResolvedValue(mockNewBranch);
      mockRepository.switchBranch.mockResolvedValue(mockSwitchedEnvironment);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new SwitchBranchCommand('env-1', 'branch-2', 'user-1');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(mockSwitchedEnvironment);
      expect(mockRepository.findById).toHaveBeenCalledWith('env-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1', [
        'MANAGER',
        'OWNER',
      ]);
      expect(mockRepository.findBranchById).toHaveBeenCalledWith('branch-2');
      expect(mockRepository.switchBranch).toHaveBeenCalledWith('env-1', 'branch-2');
    });

    it('should throw NotFoundError when environment does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const command = new SwitchBranchCommand('non-existent', 'branch-2', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Environment not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockRepository.findBranchById).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks required role', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockAccessService.verifyProjectAccess.mockRejectedValue({
        message: 'Insufficient permissions for this operation',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      const command = new SwitchBranchCommand('env-1', 'branch-2', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Insufficient permissions for this operation',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockRepository.findBranchById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when branch does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.findBranchById.mockResolvedValue(null);

      const command = new SwitchBranchCommand('env-1', 'non-existent-branch', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Branch not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockRepository.switchBranch).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when branch belongs to different project', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.findBranchById.mockResolvedValue({
        id: 'branch-3',
        name: 'other-branch',
        slug: 'other-branch',
        space: {
          id: 'space-2',
          name: 'Other Space',
          slug: 'other',
          projectId: 'other-proj', // Different project
        },
      });

      const command = new SwitchBranchCommand('env-1', 'branch-3', 'user-1');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toMatchObject({
        message: 'Branch must belong to this project',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });

      expect(mockRepository.switchBranch).not.toHaveBeenCalled();
    });

    it('should publish BranchSwitchedEvent with correct data', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.findBranchById.mockResolvedValue(mockNewBranch);
      mockRepository.switchBranch.mockResolvedValue(mockSwitchedEnvironment);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new SwitchBranchCommand('env-1', 'branch-2', 'user-1');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(BranchSwitchedEvent);
      expect(publishedEvent.environment).toEqual(mockSwitchedEnvironment);
      expect(publishedEvent.previousBranchId).toBe('branch-1');
      expect(publishedEvent.previousBranchName).toBe('main');
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should switch to same project branch from different space', async () => {
      // Arrange - Branch from different space but same project
      const branchFromOtherSpace = {
        id: 'branch-4',
        name: 'release-branch',
        slug: 'release-branch',
        space: {
          id: 'space-2', // Different space
          name: 'Release Space',
          slug: 'release',
          projectId: 'proj-1', // Same project
        },
      };

      const switchedEnv = {
        ...mockExistingEnvironment,
        branchId: 'branch-4',
        branch: {
          id: 'branch-4',
          name: 'release-branch',
          slug: 'release-branch',
          spaceId: 'space-2',
          space: {
            id: 'space-2',
            name: 'Release Space',
            slug: 'release',
          },
        },
      };

      mockRepository.findById.mockResolvedValue(mockExistingEnvironment);
      mockRepository.findBranchById.mockResolvedValue(branchFromOtherSpace);
      mockRepository.switchBranch.mockResolvedValue(switchedEnv);
      mockEventBus.publish.mockResolvedValue(undefined);

      const command = new SwitchBranchCommand('env-1', 'branch-4', 'user-1');

      // Act
      const result = await handler.execute(command);

      // Assert - Should succeed since branch belongs to same project
      expect(result).toEqual(switchedEnv);
      expect(mockRepository.switchBranch).toHaveBeenCalledWith('env-1', 'branch-4');
    });
  });
});
