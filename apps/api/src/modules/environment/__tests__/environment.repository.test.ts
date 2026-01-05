/**
 * EnvironmentRepository Unit Tests
 *
 * Tests for environment data access layer with mocked Prisma client.
 */

import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EnvironmentRepository } from '../environment.repository.js';

interface MockPrisma {
  environment: {
    findUnique: Mock;
    findMany: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
  };
  branch: {
    findUnique: Mock;
  };
  project: {
    findUnique: Mock;
  };
}

function createMockPrisma(): MockPrisma {
  return {
    environment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    branch: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  };
}

describe('EnvironmentRepository', () => {
  let repository: EnvironmentRepository;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repository = new EnvironmentRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('findById', () => {
    it('should return environment with branch when found', async () => {
      const mockEnvironment = {
        id: 'env-1',
        name: 'Production',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
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

      mockPrisma.environment.findUnique.mockResolvedValue(mockEnvironment);

      const result = await repository.findById('env-1');

      expect(result).toEqual(mockEnvironment);
      expect(mockPrisma.environment.findUnique).toHaveBeenCalledWith({
        where: { id: 'env-1' },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              slug: true,
              spaceId: true,
              space: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return null when environment not found', async () => {
      mockPrisma.environment.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should return all environments for project ordered by name', async () => {
      const mockEnvironments = [
        {
          id: 'env-1',
          name: 'Alpha',
          slug: 'alpha',
          projectId: 'proj-1',
          branchId: 'branch-1',
          branch: {
            id: 'branch-1',
            name: 'main',
            slug: 'main',
            spaceId: 'space-1',
            space: {
              id: 'space-1',
              name: 'Default',
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
          branch: {
            id: 'branch-1',
            name: 'main',
            slug: 'main',
            spaceId: 'space-1',
            space: {
              id: 'space-1',
              name: 'Default',
              slug: 'default',
            },
          },
        },
      ];

      mockPrisma.environment.findMany.mockResolvedValue(mockEnvironments);

      const result = await repository.findByProjectId('proj-1');

      expect(result).toEqual(mockEnvironments);
      expect(mockPrisma.environment.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when project has no environments', async () => {
      mockPrisma.environment.findMany.mockResolvedValue([]);

      const result = await repository.findByProjectId('proj-1');

      expect(result).toEqual([]);
    });
  });

  describe('findByProjectAndSlug', () => {
    it('should return environment when found', async () => {
      const mockEnvironment = {
        id: 'env-1',
        name: 'Production',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
      };

      mockPrisma.environment.findUnique.mockResolvedValue(mockEnvironment);

      const result = await repository.findByProjectAndSlug('proj-1', 'production');

      expect(result).toEqual(mockEnvironment);
      expect(mockPrisma.environment.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_slug: {
            projectId: 'proj-1',
            slug: 'production',
          },
        },
      });
    });

    it('should return null when environment not found', async () => {
      mockPrisma.environment.findUnique.mockResolvedValue(null);

      const result = await repository.findByProjectAndSlug('proj-1', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findBranchById', () => {
    it('should return branch with space info when found', async () => {
      const mockBranch = {
        id: 'branch-1',
        name: 'main',
        slug: 'main',
        space: {
          id: 'space-1',
          name: 'Default Space',
          slug: 'default',
          projectId: 'proj-1',
        },
      };

      mockPrisma.branch.findUnique.mockResolvedValue(mockBranch);

      const result = await repository.findBranchById('branch-1');

      expect(result).toEqual(mockBranch);
      expect(mockPrisma.branch.findUnique).toHaveBeenCalledWith({
        where: { id: 'branch-1' },
        include: {
          space: {
            select: {
              id: true,
              name: true,
              slug: true,
              projectId: true,
            },
          },
        },
      });
    });

    it('should return null when branch not found', async () => {
      mockPrisma.branch.findUnique.mockResolvedValue(null);

      const result = await repository.findBranchById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('projectExists', () => {
    it('should return true when project exists', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
      });

      const result = await repository.projectExists('proj-1');

      expect(result).toBe(true);
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        select: { id: true },
      });
    });

    it('should return false when project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await repository.projectExists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create environment and return with branch', async () => {
      const mockEnvironment = {
        id: 'env-1',
        name: 'Production',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
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

      mockPrisma.environment.create.mockResolvedValue(mockEnvironment);

      const result = await repository.create({
        name: 'Production',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
      });

      expect(result).toEqual(mockEnvironment);
      expect(mockPrisma.environment.create).toHaveBeenCalledWith({
        data: {
          name: 'Production',
          slug: 'production',
          projectId: 'proj-1',
          branchId: 'branch-1',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update environment name and return with branch', async () => {
      const mockEnvironment = {
        id: 'env-1',
        name: 'Updated Name',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
        branch: {
          id: 'branch-1',
          name: 'main',
          slug: 'main',
          spaceId: 'space-1',
          space: {
            id: 'space-1',
            name: 'Default',
            slug: 'default',
          },
        },
      };

      mockPrisma.environment.update.mockResolvedValue(mockEnvironment);

      const result = await repository.update('env-1', { name: 'Updated Name' });

      expect(result).toEqual(mockEnvironment);
      expect(mockPrisma.environment.update).toHaveBeenCalledWith({
        where: { id: 'env-1' },
        data: {
          name: 'Updated Name',
        },
        include: expect.any(Object),
      });
    });

    it('should not include name in data when not provided', async () => {
      const mockEnvironment = {
        id: 'env-1',
        name: 'Production',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-1',
        branch: {
          id: 'branch-1',
          name: 'main',
          slug: 'main',
          spaceId: 'space-1',
          space: {
            id: 'space-1',
            name: 'Default',
            slug: 'default',
          },
        },
      };

      mockPrisma.environment.update.mockResolvedValue(mockEnvironment);

      await repository.update('env-1', {});

      expect(mockPrisma.environment.update).toHaveBeenCalledWith({
        where: { id: 'env-1' },
        data: {},
        include: expect.any(Object),
      });
    });
  });

  describe('switchBranch', () => {
    it('should update environment branch and return with branch details', async () => {
      const mockEnvironment = {
        id: 'env-1',
        name: 'Production',
        slug: 'production',
        projectId: 'proj-1',
        branchId: 'branch-2',
        branch: {
          id: 'branch-2',
          name: 'feature-x',
          slug: 'feature-x',
          spaceId: 'space-1',
          space: {
            id: 'space-1',
            name: 'Default',
            slug: 'default',
          },
        },
      };

      mockPrisma.environment.update.mockResolvedValue(mockEnvironment);

      const result = await repository.switchBranch('env-1', 'branch-2');

      expect(result).toEqual(mockEnvironment);
      expect(mockPrisma.environment.update).toHaveBeenCalledWith({
        where: { id: 'env-1' },
        data: { branchId: 'branch-2' },
        include: expect.any(Object),
      });
    });
  });

  describe('delete', () => {
    it('should delete environment by id', async () => {
      mockPrisma.environment.delete.mockResolvedValue({});

      await repository.delete('env-1');

      expect(mockPrisma.environment.delete).toHaveBeenCalledWith({
        where: { id: 'env-1' },
      });
    });
  });
});
