/**
 * GetEnvironmentHandler Unit Tests
 *
 * Tests for environment retrieval query handler with authorization.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AccessService } from '../../../../services/access.service.js';
import type { EnvironmentRepository } from '../../environment.repository.js';
import { GetEnvironmentHandler } from '../get-environment.handler.js';
import { GetEnvironmentQuery } from '../get-environment.query.js';

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

interface MockAccessService {
  verifyProjectAccess: Mock;
  verifyBranchAccess: Mock;
  verifyTranslationAccess: Mock;
  verifyKeyAccess: Mock;
}

function createMockAccessService(): MockAccessService {
  return {
    verifyProjectAccess: vi.fn().mockResolvedValue({ role: 'DEVELOPER' }),
    verifyBranchAccess: vi.fn(),
    verifyTranslationAccess: vi.fn(),
    verifyKeyAccess: vi.fn(),
  };
}

describe('GetEnvironmentHandler', () => {
  let handler: GetEnvironmentHandler;
  let mockRepository: MockRepository;
  let mockAccessService: MockAccessService;

  const mockEnvironmentWithBranch = {
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
    mockAccessService = createMockAccessService();
    handler = new GetEnvironmentHandler(
      mockRepository as unknown as EnvironmentRepository,
      mockAccessService as unknown as AccessService
    );
  });

  describe('execute', () => {
    it('should return environment with branch when found and authorized', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockEnvironmentWithBranch);

      const query = new GetEnvironmentQuery('env-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockEnvironmentWithBranch);
      expect(mockRepository.findById).toHaveBeenCalledWith('env-1');
      expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'proj-1');
    });

    it('should throw NotFoundError when environment not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const query = new GetEnvironmentQuery('non-existent', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Environment not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockAccessService.verifyProjectAccess).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user is not project member (hides resource existence)', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockEnvironmentWithBranch);
      // Create error with FORBIDDEN code to simulate AccessService behavior
      const forbiddenError = Object.assign(new Error('Not authorized to access this project'), {
        code: 'FORBIDDEN',
        statusCode: 403,
      });
      mockAccessService.verifyProjectAccess.mockRejectedValue(forbiddenError);

      const query = new GetEnvironmentQuery('env-1', 'unauthorized-user');

      // Act & Assert - Returns 404 instead of 403 to hide resource existence
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Environment not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should propagate non-ForbiddenError errors', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockEnvironmentWithBranch);
      mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Database error'));

      const query = new GetEnvironmentQuery('env-1', 'user-1');

      // Act & Assert - Non-ForbiddenError errors should propagate
      await expect(handler.execute(query)).rejects.toThrow('Database error');
    });

    it('should call repository with correct id', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const query = new GetEnvironmentQuery('specific-id-123', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });

      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.findById).toHaveBeenCalledWith('specific-id-123');
    });
  });
});
