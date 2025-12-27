/**
 * Branch Service
 *
 * Handles branch CRUD operations with copy-on-write functionality.
 * Per Design Doc and ADR-0002: When creating a branch from a source branch,
 * all TranslationKeys and Translations are copied to the new branch.
 */
import { PrismaClient, Branch } from '@prisma/client';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../plugins/error-handler.js';

export interface CreateBranchInput {
  name: string;
  spaceId: string;
  fromBranchId: string;
}

export interface BranchWithKeyCount extends Branch {
  keyCount: number;
}

export interface BranchWithDetails extends Branch {
  keyCount: number;
  space: {
    id: string;
    name: string;
    slug: string;
    projectId: string;
  };
}

export class BranchService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new branch with copy-on-write from source branch
   *
   * Per ADR-0002: When creating a branch, all TranslationKeys and Translations
   * are copied from the source branch to the new branch in a transaction.
   *
   * @param input - Branch creation data
   * @returns Created branch with key count
   * @throws NotFoundError if space or source branch doesn't exist
   * @throws ValidationError if source branch belongs to different space
   * @throws ConflictError if branch name already exists in space
   */
  async create(input: CreateBranchInput): Promise<BranchWithKeyCount> {
    // Verify space exists
    const space = await this.prisma.space.findUnique({
      where: { id: input.spaceId },
    });

    if (!space) {
      throw new NotFoundError('Space');
    }

    // Verify source branch exists and belongs to same space
    const sourceBranch = await this.prisma.branch.findUnique({
      where: { id: input.fromBranchId },
    });

    if (!sourceBranch) {
      throw new NotFoundError('Source branch');
    }

    if (sourceBranch.spaceId !== input.spaceId) {
      throw new ValidationError('Source branch must belong to the same space');
    }

    // Generate slug from name
    const slug = input.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    // Check for duplicate slug within space
    const existing = await this.prisma.branch.findUnique({
      where: {
        spaceId_slug: {
          spaceId: input.spaceId,
          slug,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Branch with this name already exists in the space');
    }

    // Copy-on-write: Create branch and copy all keys/translations in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the new branch
      const newBranch = await tx.branch.create({
        data: {
          name: input.name,
          slug,
          spaceId: input.spaceId,
          sourceBranchId: input.fromBranchId,
          isDefault: false,
        },
      });

      // Get all keys from source branch with translations
      const sourceKeys = await tx.translationKey.findMany({
        where: { branchId: input.fromBranchId },
        include: { translations: true },
      });

      // Copy keys and translations
      for (const sourceKey of sourceKeys) {
        const newKey = await tx.translationKey.create({
          data: {
            branchId: newBranch.id,
            name: sourceKey.name,
            description: sourceKey.description,
          },
        });

        // Copy translations for this key
        if (sourceKey.translations.length > 0) {
          await tx.translation.createMany({
            data: sourceKey.translations.map((t) => ({
              keyId: newKey.id,
              language: t.language,
              value: t.value,
            })),
          });
        }
      }

      return newBranch;
    });

    // Get key count
    const keyCount = await this.prisma.translationKey.count({
      where: { branchId: result.id },
    });

    return {
      ...result,
      keyCount,
    };
  }

  /**
   * Find branch by ID with details including space info
   *
   * @param id - Branch ID
   * @returns Branch with details or null
   */
  async findById(id: string): Promise<BranchWithDetails | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
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

    if (!branch) return null;

    const keyCount = await this.prisma.translationKey.count({
      where: { branchId: id },
    });

    return {
      ...branch,
      keyCount,
    };
  }

  /**
   * Find all branches for a space
   *
   * @param spaceId - Space ID
   * @returns Array of branches with key counts, ordered by isDefault desc then name asc
   */
  async findBySpaceId(spaceId: string): Promise<BranchWithKeyCount[]> {
    const branches = await this.prisma.branch.findMany({
      where: { spaceId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Get key counts for all branches
    const keyCountsPromises = branches.map((b) =>
      this.prisma.translationKey.count({ where: { branchId: b.id } })
    );
    const keyCounts = await Promise.all(keyCountsPromises);

    return branches.map((b, i) => ({
      ...b,
      keyCount: keyCounts[i],
    }));
  }

  /**
   * Delete branch
   *
   * @param id - Branch ID
   * @throws NotFoundError if branch doesn't exist
   * @throws ValidationError if branch is default or used by environments
   */
  async delete(id: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    if (branch.isDefault) {
      throw new ValidationError('Cannot delete the default branch');
    }

    // Check if any environments point to this branch
    const environments = await this.prisma.environment.findMany({
      where: { branchId: id },
    });

    if (environments.length > 0) {
      throw new ValidationError(
        'Cannot delete branch: it is used by one or more environments'
      );
    }

    await this.prisma.branch.delete({
      where: { id },
    });
  }

  /**
   * Get space ID for a branch
   *
   * Helper method to verify branch ownership before operations
   *
   * @param branchId - Branch ID
   * @returns Space ID or null if branch doesn't exist
   */
  async getSpaceIdByBranchId(branchId: string): Promise<string | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { spaceId: true },
    });
    return branch?.spaceId || null;
  }

  /**
   * Get project ID for a branch
   *
   * Helper method for authorization checks
   *
   * @param branchId - Branch ID
   * @returns Project ID or null if branch doesn't exist
   */
  async getProjectIdByBranchId(branchId: string): Promise<string | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        space: {
          select: { projectId: true },
        },
      },
    });
    return branch?.space?.projectId || null;
  }
}
