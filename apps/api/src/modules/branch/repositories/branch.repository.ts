/**
 * Branch Repository
 *
 * Data access layer for branch operations.
 * Business logic lives in command/query handlers, not here.
 */
import type { Branch, Prisma, PrismaClient } from '@prisma/client';

export interface BranchWithKeyCount extends Branch {
  keyCount: number;
}

export interface BranchWithSpace extends Branch {
  space: {
    id: string;
    name: string;
    slug: string;
    projectId: string;
  };
}

export interface BranchWithDetails extends BranchWithSpace {
  keyCount: number;
}

export interface CreateBranchData {
  name: string;
  slug: string;
  spaceId: string;
  sourceBranchId: string;
  isDefault?: boolean;
}

export class BranchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find branch by ID with space details
   */
  async findById(id: string): Promise<BranchWithSpace | null> {
    return this.prisma.branch.findUnique({
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
  }

  /**
   * Find branch with minimal data for diff computation
   */
  async findBranchForDiff(id: string): Promise<{
    id: string;
    name: string;
    spaceId: string;
    sourceBranchId: string | null;
  } | null> {
    return this.prisma.branch.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        spaceId: true,
        sourceBranchId: true,
      },
    });
  }

  /**
   * Find branch by ID with space details and key count
   */
  async findByIdWithKeyCount(id: string): Promise<BranchWithDetails | null> {
    const branch = await this.findById(id);
    if (!branch) return null;

    const keyCount = await this.prisma.translationKey.count({
      where: { branchId: id },
    });

    return { ...branch, keyCount };
  }

  /**
   * Find all branches for a space with key counts
   */
  async findBySpaceId(spaceId: string): Promise<BranchWithKeyCount[]> {
    const branches = await this.prisma.branch.findMany({
      where: { spaceId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const keyCounts = await Promise.all(
      branches.map((b) => this.prisma.translationKey.count({ where: { branchId: b.id } }))
    );

    return branches.map((b, i) => ({ ...b, keyCount: keyCounts[i] }));
  }

  /**
   * Find branch by space ID and slug (for uniqueness check)
   */
  async findBySpaceAndSlug(spaceId: string, slug: string): Promise<Branch | null> {
    return this.prisma.branch.findUnique({
      where: { spaceId_slug: { spaceId, slug } },
    });
  }

  /**
   * Check if space exists
   */
  async spaceExists(spaceId: string): Promise<boolean> {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { id: true },
    });
    return !!space;
  }

  /**
   * Get project ID from space ID
   */
  async getProjectIdBySpaceId(spaceId: string): Promise<string | null> {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { projectId: true },
    });
    return space?.projectId ?? null;
  }

  /**
   * Get project ID from branch ID
   */
  async getProjectIdByBranchId(branchId: string): Promise<string | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { space: { select: { projectId: true } } },
    });
    return branch?.space?.projectId ?? null;
  }

  /**
   * Create a branch (basic create, no copy-on-write - that's in the handler)
   * Accepts optional transaction client for atomic operations.
   */
  async create(data: CreateBranchData, tx?: Prisma.TransactionClient): Promise<Branch> {
    const client = tx ?? this.prisma;
    return client.branch.create({
      data: {
        name: data.name,
        slug: data.slug,
        spaceId: data.spaceId,
        sourceBranchId: data.sourceBranchId,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  /**
   * Delete a branch by ID
   */
  async delete(id: string): Promise<void> {
    await this.prisma.branch.delete({ where: { id } });
  }

  /**
   * Check if branch is used by any environments
   */
  async hasEnvironments(branchId: string): Promise<boolean> {
    const count = await this.prisma.environment.count({
      where: { branchId },
    });
    return count > 0;
  }

  /**
   * Get all translation keys with their translations for a branch (for copy-on-write)
   */
  async getKeysWithTranslations(
    branchId: string
  ): Promise<
    Array<{
      name: string;
      description: string | null;
      translations: Array<{ language: string; value: string }>;
    }>
  > {
    return this.prisma.translationKey.findMany({
      where: { branchId },
      select: {
        name: true,
        description: true,
        translations: {
          select: {
            language: true,
            value: true,
          },
        },
      },
    });
  }

  /**
   * Copy keys and translations from source branch to target branch (transactional)
   */
  async copyKeysAndTranslations(
    sourceBranchId: string,
    targetBranchId: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const sourceKeys = await client.translationKey.findMany({
      where: { branchId: sourceBranchId },
      include: { translations: true },
    });

    for (const sourceKey of sourceKeys) {
      const newKey = await client.translationKey.create({
        data: {
          branchId: targetBranchId,
          name: sourceKey.name,
          description: sourceKey.description,
        },
      });

      if (sourceKey.translations.length > 0) {
        await client.translation.createMany({
          data: sourceKey.translations.map((t) => ({
            keyId: newKey.id,
            language: t.language,
            value: t.value,
          })),
        });
      }
    }

    return sourceKeys.length;
  }

  /**
   * Execute operations in a transaction
   */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
