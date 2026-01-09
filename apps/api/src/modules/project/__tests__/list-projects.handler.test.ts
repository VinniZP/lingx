/**
 * ListProjectsHandler Unit Tests
 *
 * Tests for listing user's projects query handler.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ProjectRepository, ProjectWithStatsAndRole } from '../project.repository.js';
import { ListProjectsHandler } from '../queries/list-projects.handler.js';
import { ListProjectsQuery } from '../queries/list-projects.query.js';

interface MockRepository {
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

function createMockRepository(): MockRepository {
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

describe('ListProjectsHandler', () => {
  let handler: ListProjectsHandler;
  let mockRepository: MockRepository;

  const mockProjectsWithStats: ProjectWithStatsAndRole[] = [
    {
      project: {
        id: 'proj-1',
        name: 'Project One',
        slug: 'project-one',
        description: 'First project',
        defaultLanguage: 'en',
        activityRetentionDays: 90,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        languages: [
          { id: 'lang-1', code: 'en', name: 'English', isDefault: true },
          { id: 'lang-2', code: 'es', name: 'Spanish', isDefault: false },
        ],
        stats: {
          totalKeys: 100,
          translatedKeys: 150,
          completionRate: 0.75,
        },
      },
      role: 'OWNER',
    },
    {
      project: {
        id: 'proj-2',
        name: 'Project Two',
        slug: 'project-two',
        description: null,
        defaultLanguage: 'en',
        activityRetentionDays: 90,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-04'),
        languages: [{ id: 'lang-3', code: 'en', name: 'English', isDefault: true }],
        stats: {
          totalKeys: 50,
          translatedKeys: 50,
          completionRate: 1.0,
        },
      },
      role: 'DEVELOPER',
    },
  ];

  beforeEach(() => {
    mockRepository = createMockRepository();
    handler = new ListProjectsHandler(mockRepository as unknown as ProjectRepository);
  });

  describe('execute', () => {
    it('should return list of projects with stats for user', async () => {
      // Arrange
      mockRepository.findByUserIdWithStats.mockResolvedValue(mockProjectsWithStats);

      const query = new ListProjectsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockProjectsWithStats);
      expect(result).toHaveLength(2);
      expect(mockRepository.findByUserIdWithStats).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when user has no projects', async () => {
      // Arrange
      mockRepository.findByUserIdWithStats.mockResolvedValue([]);

      const query = new ListProjectsQuery('user-without-projects');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockRepository.findByUserIdWithStats).toHaveBeenCalledWith('user-without-projects');
    });

    it('should return projects with correct role for user', async () => {
      // Arrange
      mockRepository.findByUserIdWithStats.mockResolvedValue(mockProjectsWithStats);

      const query = new ListProjectsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result[0].role).toBe('OWNER');
      expect(result[1].role).toBe('DEVELOPER');
    });

    it('should return projects with stats included', async () => {
      // Arrange
      mockRepository.findByUserIdWithStats.mockResolvedValue(mockProjectsWithStats);

      const query = new ListProjectsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result[0].project.stats).toBeDefined();
      expect(result[0].project.stats.totalKeys).toBe(100);
      expect(result[0].project.stats.translatedKeys).toBe(150);
      expect(result[0].project.stats.completionRate).toBe(0.75);
    });

    it('should return projects with languages included', async () => {
      // Arrange
      mockRepository.findByUserIdWithStats.mockResolvedValue(mockProjectsWithStats);

      const query = new ListProjectsQuery('user-1');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result[0].project.languages).toHaveLength(2);
      expect(result[0].project.languages[0].code).toBe('en');
      expect(result[0].project.languages[0].isDefault).toBe(true);
    });

    it('should call repository with correct user id', async () => {
      // Arrange
      mockRepository.findByUserIdWithStats.mockResolvedValue([]);

      const query = new ListProjectsQuery('specific-user-id');

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findByUserIdWithStats).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByUserIdWithStats).toHaveBeenCalledWith('specific-user-id');
    });
  });
});
