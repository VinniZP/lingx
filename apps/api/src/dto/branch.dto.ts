/**
 * Branch DTOs - transforms Prisma Branch model to API response format
 */
import type { Branch } from '@prisma/client';
import type {
  BranchResponse,
  BranchWithSpace,
} from '@lingx/shared';

/** Branch from service with keyCount directly or via _count */
type BranchWithKeyCount = Branch & {
  keyCount?: number;
  _count?: { keys: number };
};

/** Service returns partial space info */
type BranchWithSpaceFromPrisma = BranchWithKeyCount & {
  space: {
    id: string;
    name: string;
    slug: string;
    projectId: string;
  };
};

/**
 * Transform Prisma Branch to BranchResponse
 * Handles both direct keyCount (from service) and _count.keys (from Prisma include)
 */
export function toBranchDto(branch: BranchWithKeyCount): BranchResponse {
  return {
    id: branch.id,
    name: branch.name,
    slug: branch.slug,
    isDefault: branch.isDefault,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt?.toISOString(),
    spaceId: branch.spaceId,
    sourceBranchId: branch.sourceBranchId,
    keyCount: branch.keyCount ?? branch._count?.keys,
  };
}

/**
 * Transform array of branches
 */
export function toBranchDtoList(branches: BranchWithKeyCount[]): BranchResponse[] {
  return branches.map(toBranchDto);
}

/**
 * Transform Prisma Branch with Space to BranchWithSpace
 */
export function toBranchWithSpaceDto(branch: BranchWithSpaceFromPrisma): BranchWithSpace {
  return {
    ...toBranchDto(branch),
    space: {
      id: branch.space.id,
      name: branch.space.name,
      slug: branch.space.slug,
      projectId: branch.space.projectId,
    },
  };
}
