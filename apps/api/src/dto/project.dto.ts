/**
 * Project DTOs - transforms Prisma Project model to API response format
 */
import type {
  MemberRole,
  ProjectLanguage,
  ProjectResponse,
  ProjectTreeResponse,
  ProjectWithStats,
} from '@lingx/shared';
import type {
  ProjectWithLanguages,
  ProjectWithLanguagesAndStats,
} from '../services/project.service.js';

/**
 * Transform language to ProjectLanguage
 */
function toLanguageDto(lang: {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}): ProjectLanguage {
  return {
    id: lang.id,
    code: lang.code,
    name: lang.name,
    isDefault: lang.isDefault,
  };
}

/**
 * Transform Prisma Project to ProjectResponse
 * Converts Dates to ISO strings
 * @param project - The project data
 * @param myRole - The current user's role in this project
 */
export function toProjectDto(project: ProjectWithLanguages, myRole: MemberRole): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    defaultLanguage: project.defaultLanguage,
    languages: project.languages.map(toLanguageDto),
    myRole,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Transform Prisma Project with stats to ProjectWithStats
 */
export function toProjectWithStatsDto(
  project: ProjectWithLanguagesAndStats,
  myRole: MemberRole
): ProjectWithStats {
  return {
    ...toProjectDto(project, myRole),
    stats: project.stats,
  };
}

/**
 * Transform array of projects with stats and roles
 */
export function toProjectWithStatsDtoList(
  projectsWithRoles: Array<{ project: ProjectWithLanguagesAndStats; role: MemberRole }>
): ProjectWithStats[] {
  return projectsWithRoles.map(({ project, role }) => toProjectWithStatsDto(project, role));
}

/**
 * Transform project tree data to ProjectTreeResponse
 * Accepts either Prisma raw format (_count.keys) or repository format (keyCount)
 */
export function toProjectTreeDto(project: {
  id: string;
  name: string;
  slug: string;
  spaces: Array<{
    id: string;
    name: string;
    slug: string;
    branches: Array<{
      id: string;
      name: string;
      slug: string;
      isDefault: boolean;
      keyCount?: number;
      _count?: { keys: number };
    }>;
  }>;
}): ProjectTreeResponse {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    spaces: project.spaces.map((space) => ({
      id: space.id,
      name: space.name,
      slug: space.slug,
      branches: space.branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        slug: branch.slug,
        isDefault: branch.isDefault,
        keyCount: branch.keyCount ?? branch._count?.keys ?? 0,
      })),
    })),
  };
}
