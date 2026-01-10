import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../../plugins/error-handler.js';
import type { AccessService } from '../../../../services/access.service.js';
import type { BranchRepository, BranchWithDetails } from '../../repositories/branch.repository.js';
import { GetBranchHandler } from '../get-branch.handler.js';
import { GetBranchQuery } from '../get-branch.query.js';

// Mock factories
const createMockRepository = () => ({
  findByIdWithKeyCount: vi.fn(),
});

const createMockAccessService = () => ({
  verifyProjectAccess: vi.fn(),
});

describe('GetBranchHandler', () => {
  let handler: GetBranchHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockAccessService: ReturnType<typeof createMockAccessService>;

  const mockBranch: BranchWithDetails = {
    id: 'branch-1',
    name: 'main',
    slug: 'main',
    isDefault: true,
    spaceId: 'space-1',
    sourceBranchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    keyCount: 10,
    space: {
      id: 'space-1',
      name: 'Default Space',
      slug: 'default-space',
      projectId: 'project-1',
    },
  };

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockAccessService = createMockAccessService();
    handler = new GetBranchHandler(
      mockRepo as unknown as BranchRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('Happy Path', () => {
    it('should return branch with details when user has access', async () => {
      // Arrange
      const query = new GetBranchQuery('branch-1', 'user-1');
      mockRepo.findByIdWithKeyCount.mockResolvedValue(mockBranch);
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockBranch);
      expect(mockRepo.findByIdWithKeyCount).toHaveBeenCalledWith('branch-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when branch does not exist', async () => {
      // Arrange
      const query = new GetBranchQuery('nonexistent-branch', 'user-1');
      mockRepo.findByIdWithKeyCount.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Branch not found');
      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks project access', async () => {
      // Arrange
      const query = new GetBranchQuery('branch-1', 'unauthorized-user');
      mockRepo.findByIdWithKeyCount.mockResolvedValue(mockBranch);
      mockAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenError('Not a member of this project')
      );

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Not a member of this project');
    });
  });
});
