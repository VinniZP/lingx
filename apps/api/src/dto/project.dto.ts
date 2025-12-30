/**
 * Project DTOs - transforms Prisma Project model to API response format
 */
import type {
  ProjectWithLanguages,
  ProjectWithLanguagesAndStats,
} from '../services/project.service.js';
import type {
  ProjectResponse,
  ProjectLanguage,
  ProjectWithStats,
  ProjectTreeResponse,
} from '@localeflow/shared';

/**
 * Transform language to ProjectLanguage
 */
function toLanguageDto(lang: { id: string; code: string; name: string; isDefault: boolean }): ProjectLanguage {
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
 */
export function toProjectDto(project: ProjectWithLanguages): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    defaultLanguage: project.defaultLanguage,
    languages: project.languages.map(toLanguageDto),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Transform Prisma Project with stats to ProjectWithStats
 */
export function toProjectWithStatsDto(
  project: ProjectWithLanguagesAndStats
): ProjectWithStats {
  return {
    ...toProjectDto(project),
    stats: project.stats,
  };
}

/**
 * Transform array of projects
 */
export function toProjectDtoList(projects: ProjectWithLanguages[]): ProjectResponse[] {
  return projects.map(toProjectDto);
}

/**
 * Transform array of projects with stats
 */
export function toProjectWithStatsDtoList(
  projects: ProjectWithLanguagesAndStats[]
): ProjectWithStats[] {
  return projects.map(toProjectWithStatsDto);
}

/**
 * Transform project tree data to ProjectTreeResponse
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
      _count: { keys: number };
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
        keyCount: branch._count.keys,
      })),
    })),
  };
}
