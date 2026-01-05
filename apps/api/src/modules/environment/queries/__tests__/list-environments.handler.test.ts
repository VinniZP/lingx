/**
 * ListEnvironmentsHandler Unit Tests
 *
 * Tests for environments listing query handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { EnvironmentRepository } from '../../environment.repository.js';
import { ListEnvironmentsHandler } from '../list-environments.handler.js';
import { ListEnvironmentsQuery } from '../list-environments.query.js';

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

describe('ListEnvironmentsHandler', () => {
  let handler: ListEnvironmentsHandler;
  let mockRepository: MockRepository;

  const mockEnvironments = [
    {
      id: 'env-1',
      name: 'Development',
      slug: 'development',
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
    },
    {
      id: 'env-2',
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
    },
    {
      id: 'env-3',
      name: 'Staging',
      slug: 'staging',
      projectId: 'proj-1',
      branchId: 'branch-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      branch: {
        id: 'branch-2',
        name: 'develop',
        slug: 'develop',
        spaceId: 'space-1',
        space: {
          id: 'space-1',
          name: 'Default Space',
          slug: 'default',
        },
      },
    },
  ];

  beforeEach(() => {
    mockRepository = createMockRepository();
    handler = new ListEnvironmentsHandler(mockRepository as unknown as EnvironmentRepository);
  });

  describe('execute', () => {
    it('should return list of environments for project', async () => {
      // Arrange
      mockRepository.findByProjectId.mockResolvedValue(mockEnvironments);

      const query = new ListEnvironmentsQuery('proj-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockEnvironments);
      expect(result).toHaveLength(3);
      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('proj-1');
    });

    it('should return empty array when project has no environments', async () => {
      // Arrange
      mockRepository.findByProjectId.mockResolvedValue([]);

      const query = new ListEnvironmentsQuery('proj-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should call repository with correct project id', async () => {
      // Arrange
      mockRepository.findByProjectId.mockResolvedValue([]);

      const query = new ListEnvironmentsQuery('specific-project-id');

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findByProjectId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('specific-project-id');
    });

    it('should return environments with branch details', async () => {
      // Arrange
      mockRepository.findByProjectId.mockResolvedValue(mockEnvironments);

      const query = new ListEnvironmentsQuery('proj-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result[0].branch).toBeDefined();
      expect(result[0].branch.name).toBe('main');
      expect(result[0].branch.space).toBeDefined();
    });

    it('should return environments pointing to different branches', async () => {
      // Arrange
      mockRepository.findByProjectId.mockResolvedValue(mockEnvironments);

      const query = new ListEnvironmentsQuery('proj-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      const branchIds = result.map((env) => env.branchId);
      expect(branchIds).toContain('branch-1');
      expect(branchIds).toContain('branch-2');
    });
  });
});
