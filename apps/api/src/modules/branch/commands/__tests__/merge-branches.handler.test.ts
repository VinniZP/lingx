import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../../plugins/error-handler.js';
import type { AccessService } from '../../../../services/access.service.js';
import type { IEventBus } from '../../../../shared/cqrs/index.js';
import type { BranchRepository, BranchWithSpace } from '../../repositories/branch.repository.js';
import type { MergeExecutor, MergeResult } from '../../services/merge-executor.js';
import { MergeBranchesCommand } from '../merge-branches.command.js';
import { MergeBranchesHandler } from '../merge-branches.handler.js';

// Mock factories
const createMockRepository = () => ({
  getProjectIdByBranchId: vi.fn(),
  findById: vi.fn(),
});

const createMockMergeExecutor = () => ({
  merge: vi.fn(),
});

const createMockAccessService = () => ({
  verifyProjectAccess: vi.fn(),
});

const createMockEventBus = () => ({
  publish: vi.fn(),
});

describe('MergeBranchesHandler', () => {
  let handler: MergeBranchesHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockMergeExecutor: ReturnType<typeof createMockMergeExecutor>;
  let mockAccessService: ReturnType<typeof createMockAccessService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const mockSourceBranch: BranchWithSpace = {
    id: 'source-branch',
    name: 'feature',
    slug: 'feature',
    isDefault: false,
    spaceId: 'space-1',
    sourceBranchId: 'main-branch',
    createdAt: new Date(),
    updatedAt: new Date(),
    space: {
      id: 'space-1',
      name: 'Default Space',
      slug: 'default-space',
      projectId: 'project-1',
    },
  };

  const mockTargetBranch: BranchWithSpace = {
    id: 'target-branch',
    name: 'main',
    slug: 'main',
    isDefault: true,
    spaceId: 'space-1',
    sourceBranchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    space: {
      id: 'space-1',
      name: 'Default Space',
      slug: 'default-space',
      projectId: 'project-1',
    },
  };

  const successMergeResult: MergeResult = {
    success: true,
    merged: 5,
  };

  const conflictMergeResult: MergeResult = {
    success: false,
    merged: 0,
    conflicts: [{ key: 'conflict.key', source: { en: 'Source' }, target: { en: 'Target' } }],
  };

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockMergeExecutor = createMockMergeExecutor();
    mockAccessService = createMockAccessService();
    mockEventBus = createMockEventBus();
    handler = new MergeBranchesHandler(
      mockRepo as unknown as BranchRepository,
      mockMergeExecutor as unknown as MergeExecutor,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should merge branches and emit event on success', async () => {
      // Arrange
      const command = new MergeBranchesCommand(
        'source-branch',
        'target-branch',
        undefined,
        'user-1'
      );
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockImplementation((id) => {
        if (id === 'source-branch') return Promise.resolve(mockSourceBranch);
        if (id === 'target-branch') return Promise.resolve(mockTargetBranch);
        return Promise.resolve(null);
      });
      mockMergeExecutor.merge.mockResolvedValue(successMergeResult);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(successMergeResult);
      expect(mockRepo.getProjectIdByBranchId).toHaveBeenCalledWith('source-branch');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
      expect(mockMergeExecutor.merge).toHaveBeenCalledWith('source-branch', {
        targetBranchId: 'target-branch',
        resolutions: undefined,
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceBranchId: 'source-branch',
          sourceBranchName: 'feature',
          targetBranchId: 'target-branch',
          targetBranchName: 'main',
          projectId: 'project-1',
          conflictsResolved: 0,
          userId: 'user-1',
        })
      );
    });

    it('should return conflicts without emitting event when conflicts exist', async () => {
      // Arrange
      const command = new MergeBranchesCommand(
        'source-branch',
        'target-branch',
        undefined,
        'user-1'
      );
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockImplementation((id) => {
        if (id === 'source-branch') return Promise.resolve(mockSourceBranch);
        if (id === 'target-branch') return Promise.resolve(mockTargetBranch);
        return Promise.resolve(null);
      });
      mockMergeExecutor.merge.mockResolvedValue(conflictMergeResult);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(conflictMergeResult);
      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should merge with resolutions and emit event with conflict count', async () => {
      // Arrange
      const resolutions = [{ key: 'conflict.key', resolution: 'source' as const }];
      const command = new MergeBranchesCommand(
        'source-branch',
        'target-branch',
        resolutions,
        'user-1'
      );
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockImplementation((id) => {
        if (id === 'source-branch') return Promise.resolve(mockSourceBranch);
        if (id === 'target-branch') return Promise.resolve(mockTargetBranch);
        return Promise.resolve(null);
      });
      mockMergeExecutor.merge.mockResolvedValue(successMergeResult);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockMergeExecutor.merge).toHaveBeenCalledWith('source-branch', {
        targetBranchId: 'target-branch',
        resolutions,
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          conflictsResolved: 1,
        })
      );
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when source branch does not exist', async () => {
      // Arrange
      const command = new MergeBranchesCommand(
        'nonexistent-branch',
        'target-branch',
        undefined,
        'user-1'
      );
      mockRepo.getProjectIdByBranchId.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Source branch not found');
      expect(mockMergeExecutor.merge).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks project access', async () => {
      // Arrange
      const command = new MergeBranchesCommand(
        'source-branch',
        'target-branch',
        undefined,
        'unauthorized-user'
      );
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenError('Not a member of this project')
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Not a member of this project');
      expect(mockMergeExecutor.merge).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when target branch does not exist', async () => {
      // Arrange
      const command = new MergeBranchesCommand(
        'source-branch',
        'nonexistent-target',
        undefined,
        'user-1'
      );
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockImplementation((id) => {
        if (id === 'source-branch') return Promise.resolve(mockSourceBranch);
        return Promise.resolve(null); // Target branch not found
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Target branch not found');
      expect(mockMergeExecutor.merge).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when source branch findById returns null', async () => {
      // Arrange
      const command = new MergeBranchesCommand(
        'source-branch',
        'target-branch',
        undefined,
        'user-1'
      );
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockResolvedValue(null); // Both branches return null

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Source branch not found');
      expect(mockMergeExecutor.merge).not.toHaveBeenCalled();
    });
  });
});
