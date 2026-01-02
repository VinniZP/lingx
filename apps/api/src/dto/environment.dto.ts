/**
 * Environment DTOs - transforms Prisma Environment model to API response format
 */
import type { Environment } from '@prisma/client';
import type { EnvironmentResponse } from '@lingx/shared';

type EnvironmentWithBranch = Environment & {
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
};

/**
 * Transform Prisma Environment to EnvironmentResponse
 */
export function toEnvironmentDto(env: EnvironmentWithBranch): EnvironmentResponse {
  return {
    id: env.id,
    name: env.name,
    slug: env.slug,
    projectId: env.projectId,
    branchId: env.branchId,
    branch: {
      id: env.branch.id,
      name: env.branch.name,
      slug: env.branch.slug,
      spaceId: env.branch.spaceId,
      space: {
        id: env.branch.space.id,
        name: env.branch.space.name,
        slug: env.branch.space.slug,
      },
    },
    createdAt: env.createdAt.toISOString(),
    updatedAt: env.updatedAt.toISOString(),
  };
}

/**
 * Transform array of environments
 */
export function toEnvironmentDtoList(envs: EnvironmentWithBranch[]): EnvironmentResponse[] {
  return envs.map(toEnvironmentDto);
}
