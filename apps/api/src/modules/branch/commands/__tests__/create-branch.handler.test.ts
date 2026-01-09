import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../../plugins/error-handler.js';
import type { AccessService } from '../../../../services/access.service.js';
import type { IEventBus } from '../../../../shared/cqrs/index.js';
import type {
  BranchRepository,
  BranchWithDetails,
  BranchWithSpace,
} from '../../repositories/branch.repository.js';
import { CreateBranchCommand } from '../create-branch.command.js';
import { CreateBranchHandler } from '../create-branch.handler.js';

// Mock factories
const createMockRepository = () => ({
  getProjectIdBySpaceId: vi.fn(),
  findById: vi.fn(),
  findBySpaceAndSlug: vi.fn(),
  spaceExists: vi.fn(),
  create: vi.fn(),
  copyKeysAndTranslations: vi.fn(),
  findByIdWithKeyCount: vi.fn(),
  transaction: vi.fn(),
});

const createMockAccessService = () => ({
  verifyProjectAccess: vi.fn(),
});

const createMockEventBus = () => ({
  publish: vi.fn(),
});

describe('CreateBranchHandler', () => {
  let handler: CreateBranchHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockAccessService: ReturnType<typeof createMockAccessService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const mockSourceBranch: BranchWithSpace = {
    id: 'source-branch-id',
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

  const mockCreatedBranch: BranchWithDetails = {
    id: 'new-branch-id',
    name: 'feature-branch',
    slug: 'feature-branch',
    isDefault: false,
    spaceId: 'space-1',
    sourceBranchId: 'source-branch-id',
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
    mockEventBus = createMockEventBus();
    handler = new CreateBranchHandler(
      mockRepo as unknown as BranchRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );
  });

  describe('Happy Path', () => {
    it('should create branch with copy-on-write and emit event', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'feature-branch',
        'space-1',
        'source-branch-id',
        'user-1'
      );
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.spaceExists.mockResolvedValue(true);
      mockRepo.findById.mockResolvedValue(mockSourceBranch);
      mockRepo.findBySpaceAndSlug.mockResolvedValue(null);
      mockRepo.transaction.mockImplementation(async (fn) => {
        // Simulate transaction execution
        const mockTx = {};
        return fn(mockTx);
      });
      mockRepo.create.mockResolvedValue({ ...mockCreatedBranch, keyCount: undefined });
      mockRepo.copyKeysAndTranslations.mockResolvedValue(10);
      mockRepo.findByIdWithKeyCount.mockResolvedValue(mockCreatedBranch);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual(mockCreatedBranch);
      expect(mockRepo.getProjectIdBySpaceId).toHaveBeenCalledWith('space-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
      expect(mockRepo.findById).toHaveBeenCalledWith('source-branch-id');
      expect(mockRepo.findBySpaceAndSlug).toHaveBeenCalledWith('space-1', 'feature-branch');
      expect(mockRepo.transaction).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: mockCreatedBranch,
          sourceBranchName: 'main',
          sourceBranchId: 'source-branch-id',
          userId: 'user-1',
        })
      );
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundError when space does not exist', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'feature-branch',
        'nonexistent-space',
        'source-branch-id',
        'user-1'
      );
      mockRepo.getProjectIdBySpaceId.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Space not found');
      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks project access', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'feature-branch',
        'space-1',
        'source-branch-id',
        'unauthorized-user'
      );
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenError('Not a member of this project')
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Not a member of this project');
    });

    it('should throw NotFoundError when source branch does not exist', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'feature-branch',
        'space-1',
        'nonexistent-branch',
        'user-1'
      );
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Source branch not found');
    });

    it('should throw ValidationError when source branch is from different space', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'feature-branch',
        'space-1',
        'source-branch-id',
        'user-1'
      );
      const wrongSpaceBranch = {
        ...mockSourceBranch,
        spaceId: 'different-space',
      };
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockResolvedValue(wrongSpaceBranch);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Source branch must belong to the same space'
      );
    });

    it('should throw FieldValidationError when branch name already exists in space', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'existing-branch',
        'space-1',
        'source-branch-id',
        'user-1'
      );
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockResolvedValue(mockSourceBranch);
      mockRepo.findBySpaceAndSlug.mockResolvedValue({ id: 'existing-id' });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Branch with this name already exists in the space'
      );
    });
  });

  describe('Slug Generation', () => {
    it('should convert name to lowercase slug with hyphens', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'Feature Branch Name',
        'space-1',
        'source-branch-id',
        'user-1'
      );
      mockRepo.getProjectIdBySpaceId.mockResolvedValue('project-1');
      mockAccessService.verifyProjectAccess.mockResolvedValue({ projectId: 'project-1' });
      mockRepo.findById.mockResolvedValue(mockSourceBranch);
      mockRepo.findBySpaceAndSlug.mockResolvedValue(null);
      mockRepo.transaction.mockImplementation(async (fn) => fn({}));
      mockRepo.create.mockResolvedValue({ ...mockCreatedBranch, name: 'Feature Branch Name' });
      mockRepo.copyKeysAndTranslations.mockResolvedValue(0);
      mockRepo.findByIdWithKeyCount.mockResolvedValue({
        ...mockCreatedBranch,
        name: 'Feature Branch Name',
        slug: 'feature-branch-name',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepo.findBySpaceAndSlug).toHaveBeenCalledWith('space-1', 'feature-branch-name');
    });
  });
});
