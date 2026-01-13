import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../../plugins/error-handler.js';
import type { AccessService } from '../../../access/access.service.js';
import type { BranchRepository, BranchWithKeyCount } from '../../repositories/branch.repository.js';
import { ListBranchesHandler } from '../list-branches.handler.js';
import { ListBranchesQuery } from '../list-branches.query.js';

// Mock factories
const createMockRepository = () => ({
  findBySpaceId: vi.fn(),
  getProjectIdBySpaceId: vi.fn(),
});

const createMockAccessService = () => ({
  verifyProjectAccess: vi.fn(),
});

describe('ListBranchesHandler', () => {
  let handler: ListBranchesHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockAccessService: ReturnType<typeof createMockAccessService>;

  const mockBranches: BranchWithKeyCount[] = [
    {
      id: 'branch-1',
      name: 'main',
      slug: 'main',
      isDefault: true,
      spaceId: 'space-1',
      sourceBranchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      keyCount: 10,
    },
    {
      id: 'branch-2',
      name: 'feature',
      slug: 'feature',
      isDefault: false,
      spaceId: 'space-1',
      sourceBranchId: 'branch-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      keyCount: 5,
    },
  ];

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockAccessService = createMockAccessService();
    handler = new ListBranchesHandler(
      mockRepo as unknown as BranchRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('Happy Path', () => {
    it('should return branches for a space when user has access', async () => {
      // Arrange
      const query = new ListBranchesQuery('space-1', 'user-1');
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findBySpaceId.mockResolvedValue(mockBranches);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockBranches);
      expect(mockRepo.getProjectIdBySpaceId).toHaveBeenCalledWith('space-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
      expect(mockRepo.findBySpaceId).toHaveBeenCalledWith('space-1');
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when space does not exist', async () => {
      // Arrange
      const query = new ListBranchesQuery('nonexistent-space', 'user-1');
      mockRepo.getProjectIdBySpaceId.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Space not found');
      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks project access', async () => {
      // Arrange
      const query = new ListBranchesQuery('space-1', 'unauthorized-user');
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenError('Not a member of this project')
      );

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Not a member of this project');
    });
  });
});
