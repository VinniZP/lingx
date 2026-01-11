/**
 * ListSpacesHandler Unit Tests
 *
 * Tests for listing spaces query handler.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import type { Space } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ListSpacesHandler } from '../queries/list-spaces.handler.js';
import { ListSpacesQuery } from '../queries/list-spaces.query.js';
import type { SpaceRepository } from '../space.repository.js';

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

describe('ListSpacesHandler', () => {
  let handler: ListSpacesHandler;
  let mockSpaceRepository: MockSpaceRepository;
  let mockProjectRepository: MockProjectRepository;

  const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    defaultLanguage: 'en',
    activityRetentionDays: 90,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    languages: [{ id: 'lang-1', code: 'en', name: 'English', isDefault: true }],
  };

  const mockSpaces: Space[] = [
    {
      id: 'space-1',
      name: 'Space 1',
      slug: 'space-1',
      description: 'First space',
      projectId: 'proj-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'space-2',
      name: 'Space 2',
      slug: 'space-2',
      description: 'Second space',
      projectId: 'proj-1',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(() => {
    mockSpaceRepository = createMockSpaceRepository();
    mockProjectRepository = createMockProjectRepository();
    handler = new ListSpacesHandler(
      mockSpaceRepository as unknown as SpaceRepository,
      mockProjectRepository as unknown as import('../../project/project.repository.js').ProjectRepository
    );
  });

  describe('execute', () => {
    // Happy path
    it('should return spaces for a project', async () => {
      // Arrange
      mockProjectRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.findByProjectId.mockResolvedValue(mockSpaces);

      const query = new ListSpacesQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockSpaces);
      expect(mockProjectRepository.findByIdOrSlug).toHaveBeenCalledWith('proj-1');
      expect(mockProjectRepository.checkMembership).toHaveBeenCalledWith('proj-1', 'user-1');
      expect(mockSpaceRepository.findByProjectId).toHaveBeenCalledWith('proj-1');
    });

    // Lookup by slug
    it('should support project lookup by slug', async () => {
      // Arrange
      mockProjectRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.findByProjectId.mockResolvedValue(mockSpaces);

      const query = new ListSpacesQuery('test-project', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockSpaces);
      expect(mockProjectRepository.findByIdOrSlug).toHaveBeenCalledWith('test-project');
    });

    // Project not found
    it('should throw NotFoundError when project does not exist', async () => {
      // Arrange
      mockProjectRepository.findByIdOrSlug.mockResolvedValue(null);

      const query = new ListSpacesQuery('nonexistent-project', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Project not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });

      expect(mockSpaceRepository.findByProjectId).not.toHaveBeenCalled();
    });

    // User not a member
    it('should throw ForbiddenError when user is not a project member', async () => {
      // Arrange
      mockProjectRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(false);

      const query = new ListSpacesQuery('proj-1', 'non-member-user');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toMatchObject({
        message: 'Not a member of this project',
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      expect(mockSpaceRepository.findByProjectId).not.toHaveBeenCalled();
    });

    // Empty spaces list
    it('should return empty array when project has no spaces', async () => {
      // Arrange
      mockProjectRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.findByProjectId.mockResolvedValue([]);

      const query = new ListSpacesQuery('proj-1', 'user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual([]);
    });

    // Repository error propagation
    it('should propagate repository errors', async () => {
      // Arrange
      mockProjectRepository.findByIdOrSlug.mockResolvedValue(mockProject);
      mockProjectRepository.checkMembership.mockResolvedValue(true);
      mockSpaceRepository.findByProjectId.mockRejectedValue(new Error('Database connection lost'));

      const query = new ListSpacesQuery('proj-1', 'user-1');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database connection lost');
    });
  });
});
