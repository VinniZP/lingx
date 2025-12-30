/**
 * Space DTOs - transforms Prisma Space model to API response format
 */
import type { Space } from '@prisma/client';
import type {
  SpaceResponse,
  SpaceWithBranches,
} from '@localeflow/shared';

type SpaceWithBranchesFromPrisma = Space & {
  branches: Array<{
    id: string;
    name: string;
    slug: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }>;
};

/**
 * Transform Prisma Space to SpaceResponse
 */
export function toSpaceDto(space: Space): SpaceResponse {
  return {
    id: space.id,
    name: space.name,
    slug: space.slug,
    description: space.description,
    projectId: space.projectId,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

/**
 * Transform array of spaces
 */
export function toSpaceDtoList(spaces: Space[]): SpaceResponse[] {
  return spaces.map(toSpaceDto);
}

/**
 * Transform Prisma SpaceWithBranches to SpaceWithBranches
 */
export function toSpaceWithBranchesDto(space: SpaceWithBranchesFromPrisma): SpaceWithBranches {
  return {
    ...toSpaceDto(space),
    branches: space.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      isDefault: branch.isDefault,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt?.toISOString(),
    })),
  };
}
