/**
 * GetEnvironmentHandler Unit Tests
 *
 * Tests for environment retrieval query handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
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

describe('GetEnvironmentHandler', () => {
  let handler: GetEnvironmentHandler;
  let mockRepository: MockRepository;

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
    handler = new GetEnvironmentHandler(mockRepository as unknown as EnvironmentRepository);
  });

  describe('execute', () => {
    it('should return environment with branch when found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockEnvironmentWithBranch);

      const query = new GetEnvironmentQuery('env-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockEnvironmentWithBranch);
      expect(mockRepository.findById).toHaveBeenCalledWith('env-1');
    });

    it('should return null when environment not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const query = new GetEnvironmentQuery('non-existent');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent');
    });

    it('should call repository with correct id', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const query = new GetEnvironmentQuery('specific-id-123');

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.findById).toHaveBeenCalledWith('specific-id-123');
    });
  });
});
