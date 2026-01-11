/**
 * Space Repository
 *
 * Data access layer for space operations.
 * Encapsulates all Prisma queries for the space domain.
 */
import type { UpdateSpaceInput } from '@lingx/shared';
import type { PrismaClient, Space } from '@prisma/client';

// Re-export for convenience
export type { UpdateSpaceInput } from '@lingx/shared';

/**
 * Non-empty array type - guarantees at least one element.
 * Per ADR-0002: Every space has at least a main branch.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Branch summary for space responses.
 */
export interface BranchSummary {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
}

/**
 * Space with branches for API responses.
 * branches is a NonEmptyArray because every space has at least a main branch.
 */
export interface SpaceWithBranches extends Space {
  branches: NonEmptyArray<BranchSummary>;
}

/**
 * Space statistics response.
 */
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

/**
 * Input for creating a space.
 */
export interface CreateSpaceInput {
  name: string;
  slug: string;
  description?: string;
  projectId: string;
}

export class SpaceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find space by ID with branches.
   * Returns SpaceWithBranches which guarantees at least one branch (per ADR-0002).
   */
  async findById(id: string): Promise<SpaceWithBranches | null> {
    const space = await this.prisma.space.findUnique({
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
    // Safe assertion: create() always creates a main branch atomically
    return space as SpaceWithBranches | null;
  }

  /**
   * Find all spaces for a project.
   */
  async findByProjectId(projectId: string): Promise<Space[]> {
    return this.prisma.space.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Check if a space with the given slug exists in the project.
   */
  async existsBySlugInProject(projectId: string, slug: string): Promise<boolean> {
    const space = await this.prisma.space.findUnique({
      where: {
        projectId_slug: { projectId, slug },
      },
      select: { id: true },
    });
    return space !== null;
  }

  /**
   * Get project ID for a space.
   * Helper method to verify space ownership before operations.
   */
  async getProjectIdBySpaceId(spaceId: string): Promise<string | null> {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { projectId: true },
    });
    return space?.projectId ?? null;
  }

  /**
   * Create a new space with automatic main branch creation.
   * Per ADR-0002: Every space automatically gets a "main" branch.
   */
  async create(input: CreateSpaceInput): Promise<Space> {
    return this.prisma.$transaction(async (tx) => {
      // Create space
      const space = await tx.space.create({
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
          spaceId: space.id,
          isDefault: true,
          sourceBranchId: null,
        },
      });

      return space;
    });
  }

  /**
   * Update a space.
   */
  async update(id: string, input: UpdateSpaceInput): Promise<Space> {
    return this.prisma.space.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
  }

  /**
   * Delete a space.
   * Note: Cascade deletes all branches, keys, and translations in the space.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.space.delete({
      where: { id },
    });
  }

  /**
   * Get space statistics.
   * Returns branch count, key count, and translation coverage by language.
   */
  async getStats(id: string): Promise<SpaceStats | null> {
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

    if (!space) return null;

    // Calculate stats from default branch
    const defaultBranch = space.branches.find((b) => b.isDefault);
    const totalKeys = defaultBranch?.keys.length ?? 0;

    const translationsByLanguage: SpaceStats['translationsByLanguage'] = {};

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
          const hasTranslation = key.translations.some((t) => t.language === lang.code && t.value);
          if (hasTranslation) {
            translationsByLanguage[lang.code].translated++;
          }
        }
      }
    }

    // Calculate percentages
    for (const lang of space.project.languages) {
      const stats = translationsByLanguage[lang.code];
      stats.percentage = stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;
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
   * Check if space exists.
   */
  async exists(id: string): Promise<boolean> {
    const space = await this.prisma.space.findUnique({
      where: { id },
      select: { id: true },
    });
    return space !== null;
  }
}
