import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../../plugins/error-handler.js';
import type { AccessService } from '../../../access/access.service.js';
import type { BranchRepository } from '../../repositories/branch.repository.js';
import type { BranchDiffResult, DiffCalculator } from '../../services/diff-calculator.js';
import { ComputeDiffHandler } from '../compute-diff.handler.js';
import { ComputeDiffQuery } from '../compute-diff.query.js';

// Mock factories
const createMockRepository = () => ({
  getProjectIdByBranchId: vi.fn(),
});

const createMockDiffCalculator = () => ({
  computeDiff: vi.fn(),
});

const createMockAccessService = () => ({
  verifyProjectAccess: vi.fn(),
});

describe('ComputeDiffHandler', () => {
  let handler: ComputeDiffHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockDiffCalculator: ReturnType<typeof createMockDiffCalculator>;
  let mockAccessService: ReturnType<typeof createMockAccessService>;

  const mockDiffResult: BranchDiffResult = {
    source: { id: 'branch-1', name: 'feature' },
    target: { id: 'branch-2', name: 'main' },
    added: [{ key: 'new.key', translations: { en: 'New value' } }],
    modified: [],
    deleted: [],
    conflicts: [],
  };

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockDiffCalculator = createMockDiffCalculator();
    mockAccessService = createMockAccessService();
    handler = new ComputeDiffHandler(
      mockRepo as unknown as BranchRepository,
      mockDiffCalculator as unknown as DiffCalculator,
      mockAccessService as unknown as AccessService
    );
  });

  describe('Happy Path', () => {
    it('should return diff result when user has access', async () => {
      // Arrange
      const query = new ComputeDiffQuery('branch-1', 'branch-2', 'user-1');
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockDiffCalculator.computeDiff.mockResolvedValue(mockDiffResult);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockDiffResult);
      expect(mockRepo.getProjectIdByBranchId).toHaveBeenCalledWith('branch-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
      expect(mockDiffCalculator.computeDiff).toHaveBeenCalledWith('branch-1', 'branch-2');
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when source branch does not exist', async () => {
      // Arrange
      const query = new ComputeDiffQuery('nonexistent-branch', 'branch-2', 'user-1');
      mockRepo.getProjectIdByBranchId.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Source branch not found');
      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
      expect(mockDiffCalculator.computeDiff).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks project access', async () => {
      // Arrange
      const query = new ComputeDiffQuery('branch-1', 'branch-2', 'unauthorized-user');
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenError('Not a member of this project')
      );

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Not a member of this project');
      expect(mockDiffCalculator.computeDiff).not.toHaveBeenCalled();
    });
  });
});
