/**
 * Environment Service
 *
 * Handles environment CRUD operations with branch pointer management.
 * Per Design Doc: AC-WEB-017, AC-WEB-018, AC-WEB-019
 * Environments point to branches and are used by SDKs to fetch translations.
 */
import { PrismaClient, Environment } from '@prisma/client';
import {
  FieldValidationError,
  NotFoundError,
  ValidationError,
} from '../plugins/error-handler.js';
import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';

export interface CreateEnvironmentInput {
  name: string;
  slug: string;
  projectId: string;
  branchId: string;
}

export interface UpdateEnvironmentInput {
  name?: string;
}

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

export class EnvironmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new environment associated with a project and branch
   *
   * @param input - Environment creation data
   * @returns Created environment with branch details
   * @throws NotFoundError if project or branch doesn't exist
   * @throws ValidationError if branch doesn't belong to project
   * @throws FieldValidationError if slug already exists in project
   */
  async create(input: CreateEnvironmentInput): Promise<EnvironmentWithBranch> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: input.branchId },
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

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Verify branch belongs to a space in this project
    if (branch.space.projectId !== input.projectId) {
      throw new ValidationError('Branch must belong to a space in this project');
    }

    // Check for duplicate slug
    const existing = await this.prisma.environment.findUnique({
      where: {
        projectId_slug: {
          projectId: input.projectId,
          slug: input.slug,
        },
      },
    });

    if (existing) {
      throw new FieldValidationError(
        [
          {
            field: 'slug',
            message: 'An environment with this slug already exists in this project',
            code: UNIQUE_VIOLATION_CODES.ENVIRONMENT_SLUG,
          },
        ],
        'Environment with this slug already exists'
      );
    }

    const environment = await this.prisma.environment.create({
      data: {
        name: input.name,
        slug: input.slug,
        projectId: input.projectId,
        branchId: input.branchId,
      },
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

    return environment;
  }

  /**
   * Find environment by ID with branch details
   *
   * @param id - Environment ID
   * @returns Environment with branch or null
   */
  async findById(id: string): Promise<EnvironmentWithBranch | null> {
    return this.prisma.environment.findUnique({
      where: { id },
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
  }

  /**
   * Find all environments for a project
   *
   * @param projectId - Project ID
   * @returns Array of environments with branch details
   */
  async findByProjectId(projectId: string): Promise<EnvironmentWithBranch[]> {
    return this.prisma.environment.findMany({
      where: { projectId },
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
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update environment (name only, slug is immutable)
   *
   * @param id - Environment ID
   * @param input - Update data
   * @returns Updated environment with branch details
   * @throws NotFoundError if environment doesn't exist
   */
  async update(id: string, input: UpdateEnvironmentInput): Promise<EnvironmentWithBranch> {
    const existing = await this.prisma.environment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Environment');
    }

    return this.prisma.environment.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
      },
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
  }

  /**
   * Switch environment to point to a different branch
   *
   * @param id - Environment ID
   * @param branchId - New branch ID
   * @returns Updated environment with branch details
   * @throws NotFoundError if environment or branch doesn't exist
   * @throws ValidationError if branch doesn't belong to same project
   */
  async switchBranch(id: string, branchId: string): Promise<EnvironmentWithBranch> {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
    });

    if (!environment) {
      throw new NotFoundError('Environment');
    }

    // Verify branch exists and belongs to same project
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        space: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    if (branch.space.projectId !== environment.projectId) {
      throw new ValidationError('Branch must belong to this project');
    }

    return this.prisma.environment.update({
      where: { id },
      data: { branchId },
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
  }

  /**
   * Delete environment
   *
   * @param id - Environment ID
   * @throws NotFoundError if environment doesn't exist
   */
  async delete(id: string): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
    });

    if (!environment) {
      throw new NotFoundError('Environment');
    }

    await this.prisma.environment.delete({
      where: { id },
    });
  }
}
