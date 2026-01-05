/**
 * Environment Repository
 *
 * Data access layer for environment operations.
 * Encapsulates all Prisma queries for the environment domain.
 */
import type { Environment, PrismaClient } from '@prisma/client';

/**
 * Environment with branch details for API responses.
 */
export interface EnvironmentWithBranch extends Environment {
  branch: {
    id: string;
    name: string;
    slug: string;
    spaceId: string;
    space: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

/**
 * Branch with space project info for validation.
 */
export interface BranchWithSpace {
  id: string;
  name: string;
  slug: string;
  space: {
    id: string;
    name: string;
    slug: string;
    projectId: string;
  };
}

/**
 * Include clause for environment with branch.
 */
const environmentWithBranchInclude = {
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
} as const;

export class EnvironmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find environment by ID with branch details.
   */
  async findById(id: string): Promise<EnvironmentWithBranch | null> {
    return this.prisma.environment.findUnique({
      where: { id },
      include: environmentWithBranchInclude,
    });
  }

  /**
   * Find all environments for a project.
   */
  async findByProjectId(projectId: string): Promise<EnvironmentWithBranch[]> {
    return this.prisma.environment.findMany({
      where: { projectId },
      include: environmentWithBranchInclude,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find environment by project and slug.
   */
  async findByProjectAndSlug(projectId: string, slug: string): Promise<Environment | null> {
    return this.prisma.environment.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug,
        },
      },
    });
  }

  /**
   * Find branch by ID with space info.
   */
  async findBranchById(branchId: string): Promise<BranchWithSpace | null> {
    return this.prisma.branch.findUnique({
      where: { id: branchId },
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
  }

  /**
   * Check if project exists.
   */
  async projectExists(projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    return project !== null;
  }

  /**
   * Create a new environment.
   */
  async create(data: {
    name: string;
    slug: string;
    projectId: string;
    branchId: string;
  }): Promise<EnvironmentWithBranch> {
    return this.prisma.environment.create({
      data: {
        name: data.name,
        slug: data.slug,
        projectId: data.projectId,
        branchId: data.branchId,
      },
      include: environmentWithBranchInclude,
    });
  }

  /**
   * Update environment name.
   */
  async update(id: string, data: { name?: string }): Promise<EnvironmentWithBranch> {
    return this.prisma.environment.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
      },
      include: environmentWithBranchInclude,
    });
  }

  /**
   * Switch environment to a different branch.
   */
  async switchBranch(id: string, branchId: string): Promise<EnvironmentWithBranch> {
    return this.prisma.environment.update({
      where: { id },
      data: { branchId },
      include: environmentWithBranchInclude,
    });
  }

  /**
   * Delete an environment.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.environment.delete({
      where: { id },
    });
  }
}
