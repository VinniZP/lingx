/**
 * GetSpaceHandler Unit Tests
 *
 * Tests for getting a space query handler.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { GetSpaceHandler } from '../queries/get-space.handler.js';
import { GetSpaceQuery } from '../queries/get-space.query.js';
import type { SpaceRepository, SpaceWithBranches } from '../space.repository.js';

interface MockSpaceRepository {
  findById: Mock;
  findByProjectId: Mock;
  existsBySlugInProject: Mock;
  getProjectIdBySpaceId: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  exists: Mock;
}

interface MockProjectRepository {
  findById: Mock;
  findBySlug: Mock;
  findByIdOrSlug: Mock;
  existsBySlug: Mock;
  getMemberRole: Mock;
  checkMembership: Mock;
  findByUserIdWithStats: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  getStats: Mock;
  getTree: Mock;
}

function createMockSpaceRepository(): MockSpaceRepository {
  return {
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    existsBySlugInProject: vi.fn(),
    getProjectIdBySpaceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    exists: vi.fn(),
  };
}

function createMockProjectRepository(): MockProjectRepository {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByIdOrSlug: vi.fn(),
    existsBySlug: vi.fn(),
    getMemberRole: vi.fn(),
    checkMembership: vi.fn(),
    findByUserIdWithStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    getTree: vi.fn(),
  };
}

describe('GetSpaceHandler', () => {
  let handler: GetSpaceHandler;
  let mockSpaceRepository: MockSpaceRepository;
  let mockProjectRepository: MockProjectRepository;

  const mockSpaceWithBranches: SpaceWithBranches = {
    id: 'space-1',
    name: 'Test Space',
    slug: 'test-space',
    description: 'A test space',
    projectId: 'proj-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    branches: [
      {
        id: 'branch-1',
        name: 'main',
        slug: 'main',
        isDefault: true,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'branch-2',
        name: 'feature',
        slug: 'feature',
        isDefault: false,
        createdAt: new Date('2024-01-02'),
      },
    ],
  };

  beforeEach(() => {
    mockSpaceRepository = createMockSpaceRepository();
    mockProjectRepository = createMockProjectRepository();
    handler = new GetSpaceHandler(
      mockSpaceRepository as unknown as SpaceRepository,
      mockProjectRepository as unknown as import('../../project/project.repository.js').ProjectRepository
    );
  });

  describe('execute', () => {
    // Happy path
    it('should return space with branches', async () => {
      // Arrange
      mockSpaceRepository.findById.mockResolvedValue(mockSpaceWithBranches);
      mockProjectRepository.checkMembership.mockResolvedValue(true);

      const query = new GetSpaceQuery('space-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockSpaceWithBranches);
      expect(mockSpaceRepository.findById).toHaveBeenCalledWith('space-1');
      expect(mockProjectRepository.checkMembership).toHaveBeenCalledWith('proj-1', 'user-1');
    });

    // Space not found
    it('should throw NotFoundError when space does not exist', async () => {
      // Arrange
      mockSpaceRepository.findById.mockResolvedValue(null);

      const query = new GetSpaceQuery('nonexistent-space', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Space not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockProjectRepository.checkMembership).not.toHaveBeenCalled();
    });

    // User not a member
    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockSpaceRepository.findById.mockResolvedValue(mockSpaceWithBranches);
      mockProjectRepository.checkMembership.mockResolvedValue(false);

      const query = new GetSpaceQuery('space-1', 'non-member-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Not a member of this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    // Space with only main branch
    it('should return space with single branch', async () => {
      // Arrange
      const spaceWithOneBranch = {
        ...mockSpaceWithBranches,
        branches: [mockSpaceWithBranches.branches[0]],
      };
      mockSpaceRepository.findById.mockResolvedValue(spaceWithOneBranch);
      mockProjectRepository.checkMembership.mockResolvedValue(true);

      const query = new GetSpaceQuery('space-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.branches).toHaveLength(1);
      expect(result.branches[0].isDefault).toBe(true);
    });

    // Repository error propagation
    it('should propagate repository errors', async () => {
      // Arrange
      mockSpaceRepository.findById.mockRejectedValue(new Error('Database connection lost'));

      const query = new GetSpaceQuery('space-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database connection lost');
    });
  });
});
