/**
 * Space Service
 *
 * Handles space CRUD operations with automatic main branch creation.
 * Per Design Doc and ADR-0002: Spaces organize translations within a project,
 * and every space automatically gets a "main" branch upon creation.
 */
import { PrismaClient, Space } from '@prisma/client';
import {
  FieldValidationError,
  NotFoundError,
} from '../plugins/error-handler.js';
import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';

export interface CreateSpaceInput {
  name: string;
  slug: string;
  description?: string;
  projectId: string;
}

export interface UpdateSpaceInput {
  name?: string;
  description?: string;
}

export interface SpaceWithBranches extends Space {
  branches: Array<{
    id: string;
    name: string;
    slug: string;
    isDefault: boolean;
    createdAt: Date;
  }>;
}

export interface SpaceStats {
  id: string;
  name: string;
  branches: number;
  totalKeys: number;
  translationsByLanguage: Record<
    string,
    {
      translated: number;
      total: number;
      percentage: number;
    }
  >;
}

export class SpaceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new space with automatic main branch creation
   *
   * Per ADR-0002: Every space automatically gets a "main" branch
   * that serves as the default branch for translations.
   *
   * @param input - Space creation data
   * @returns Created space
   * @throws NotFoundError if project doesn't exist
   * @throws FieldValidationError if slug already exists in project
   */
  async create(input: CreateSpaceInput): Promise<Space> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      include: { languages: true },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }

    // Check for duplicate slug within project
    const existing = await this.prisma.space.findUnique({
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
            message: 'A space with this slug already exists in this project',
            code: UNIQUE_VIOLATION_CODES.SPACE_SLUG,
          },
        ],
        'Space slug already exists in this project'
      );
    }

    // Create space with main branch in a transaction
    const space = await this.prisma.$transaction(async (tx) => {
      // Create space
      const newSpace = await tx.space.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          projectId: input.projectId,
        },
      });

      // Create main branch automatically (per ADR-0002)
      await tx.branch.create({
        data: {
          name: 'main',
          slug: 'main',
          spaceId: newSpace.id,
          isDefault: true,
          sourceBranchId: null, // main branch has no source
        },
      });

      return newSpace;
    });

    return space;
  }

  /**
   * Find space by ID with branches
   *
   * @param id - Space ID
   * @returns Space with branches or null
   */
  async findById(id: string): Promise<SpaceWithBranches | null> {
    return this.prisma.space.findUnique({
      where: { id },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            slug: true,
            isDefault: true,
            createdAt: true,
          },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        },
      },
    });
  }

  /**
   * Find all spaces for a project
   *
   * @param projectId - Project ID
   * @returns Array of spaces
   */
  async findByProjectId(projectId: string): Promise<Space[]> {
    return this.prisma.space.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find space by project ID and slug
   *
   * @param projectId - Project ID
   * @param slug - Space slug
   * @returns Space with branches or null
   */
  async findByProjectAndSlug(
    projectId: string,
    slug: string
  ): Promise<SpaceWithBranches | null> {
    return this.prisma.space.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug,
        },
      },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            slug: true,
            isDefault: true,
            createdAt: true,
          },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        },
      },
    });
  }

  /**
   * Update space
   *
   * @param id - Space ID
   * @param input - Update data
   * @returns Updated space
   * @throws NotFoundError if space doesn't exist
   */
  async update(id: string, input: UpdateSpaceInput): Promise<Space> {
    const space = await this.prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundError('Space');
    }

    return this.prisma.space.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
  }

  /**
   * Delete space
   *
   * Note: Cascade deletes all branches, keys, and translations in the space
   *
   * @param id - Space ID
   * @throws NotFoundError if space doesn't exist
   */
  async delete(id: string): Promise<void> {
    const space = await this.prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundError('Space');
    }

    await this.prisma.space.delete({
      where: { id },
    });
  }

  /**
   * Get space statistics
   *
   * Returns branch count, key count, and translation coverage by language
   *
   * @param id - Space ID
   * @returns Space statistics
   * @throws NotFoundError if space doesn't exist
   */
  async getStats(id: string): Promise<SpaceStats> {
    const space = await this.prisma.space.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            languages: true,
          },
        },
        branches: {
          include: {
            keys: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
    });

    if (!space) {
      throw new NotFoundError('Space');
    }

    // Calculate stats from default branch
    const defaultBranch = space.branches.find((b) => b.isDefault);
    const totalKeys = defaultBranch?.keys.length || 0;

    const translationsByLanguage: Record<
      string,
      { translated: number; total: number; percentage: number }
    > = {};

    // Initialize language stats
    for (const lang of space.project.languages) {
      translationsByLanguage[lang.code] = {
        translated: 0,
        total: totalKeys,
        percentage: 0,
      };
    }

    // Count translations in default branch
    if (defaultBranch) {
      for (const key of defaultBranch.keys) {
        for (const lang of space.project.languages) {
          const hasTranslation = key.translations.some(
            (t) => t.language === lang.code && t.value
          );
          if (hasTranslation) {
            translationsByLanguage[lang.code].translated++;
          }
        }
      }
    }

    // Calculate percentages
    for (const lang of space.project.languages) {
      const stats = translationsByLanguage[lang.code];
      stats.percentage =
        stats.total > 0
          ? Math.round((stats.translated / stats.total) * 100)
          : 0;
    }

    return {
      id: space.id,
      name: space.name,
      branches: space.branches.length,
      totalKeys,
      translationsByLanguage,
    };
  }

  /**
   * Get project ID for a space
   *
   * Helper method to verify space ownership before operations
   *
   * @param spaceId - Space ID
   * @returns Project ID or null if space doesn't exist
   */
  async getProjectIdBySpaceId(spaceId: string): Promise<string | null> {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { projectId: true },
    });
    return space?.projectId || null;
  }
}
