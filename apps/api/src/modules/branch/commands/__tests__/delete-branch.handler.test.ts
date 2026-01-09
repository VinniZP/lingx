import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../../plugins/error-handler.js';
import type { AccessService } from '../../../../services/access.service.js';
import type { IEventBus } from '../../../../shared/cqrs/index.js';
import type { BranchRepository, BranchWithSpace } from '../../repositories/branch.repository.js';
import { DeleteBranchCommand } from '../delete-branch.command.js';
import { DeleteBranchHandler } from '../delete-branch.handler.js';

// Mock factories
const createMockRepository = () => ({
  findById: vi.fn(),
  getProjectIdByBranchId: vi.fn(),
  hasEnvironments: vi.fn(),
  delete: vi.fn(),
});

const createMockAccessService = () => ({
  verifyProjectAccess: vi.fn(),
});

const createMockEventBus = () => ({
  publish: vi.fn(),
});

describe('DeleteBranchHandler', () => {
  let handler: DeleteBranchHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockAccessService: ReturnType<typeof createMockAccessService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const mockBranch: BranchWithSpace = {
    id: 'branch-1',
    name: 'feature',
    slug: 'feature',
    isDefault: false,
    spaceId: 'space-1',
    sourceBranchId: 'main-branch-id',
    createdAt: new Date(),
    updatedAt: new Date(),
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
    mockEventBus = createMockEventBus();
    handler = new DeleteBranchHandler(
      mockRepo as unknown as BranchRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should delete branch and emit event', async () => {
      // Arrange
      const command = new DeleteBranchCommand('branch-1', 'user-1');
      mockRepo.findById.mockResolvedValue(mockBranch);
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.hasEnvironments.mockResolvedValue(false);
      mockRepo.delete.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepo.findById).toHaveBeenCalledWith('branch-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
      expect(mockRepo.hasEnvironments).toHaveBeenCalledWith('branch-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('branch-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'branch-1',
          branchName: 'feature',
          projectId: 'project-1',
          userId: 'user-1',
        })
      );
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when branch does not exist', async () => {
      // Arrange
      const command = new DeleteBranchCommand('nonexistent-branch', 'user-1');
      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Branch not found');
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks project access', async () => {
      // Arrange
      const command = new DeleteBranchCommand('branch-1', 'unauthorized-user');
      mockRepo.findById.mockResolvedValue(mockBranch);
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenError('Not a member of this project')
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Not a member of this project');
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when trying to delete default branch', async () => {
      // Arrange
      const defaultBranch = { ...mockBranch, isDefault: true };
      const command = new DeleteBranchCommand('branch-1', 'user-1');
      mockRepo.findById.mockResolvedValue(defaultBranch);
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Cannot delete the default branch');
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when branch is used by environments', async () => {
      // Arrange
      const command = new DeleteBranchCommand('branch-1', 'user-1');
      mockRepo.findById.mockResolvedValue(mockBranch);
      mockRepo.getProjectIdByBranchId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.hasEnvironments.mockResolvedValue(true);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot delete branch: it is used by one or more environments'
      );
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
