/**
 * Project Service
 *
 * Handles project CRUD operations with language management.
 * Per Design Doc: Projects are the top-level container for all localization work.
 */
import { PrismaClient, Project, ProjectRole } from '@prisma/client';
import {
  FieldValidationError,
  NotFoundError,
  ValidationError,
} from '../plugins/error-handler.js';
import { UNIQUE_VIOLATION_CODES } from '@localeflow/shared';

/** Language name lookup (common languages) */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  ru: 'Russian',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  cs: 'Czech',
  tr: 'Turkish',
  uk: 'Ukrainian',
};

export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  languageCodes: string[];
  defaultLanguage: string;
  userId: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  languageCodes?: string[];
  defaultLanguage?: string;
}

export interface ProjectWithLanguages extends Project {
  languages: Array<{
    id: string;
    code: string;
    name: string;
    isDefault: boolean;
  }>;
}

export interface ProjectWithLanguagesAndStats extends ProjectWithLanguages {
  stats: {
    totalKeys: number;
    translatedKeys: number;
    completionRate: number;
  };
}

export interface ProjectStats {
  id: string;
  name: string;
  spaces: number;
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

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new project with languages, owner membership, and default space+branch
   *
   * Auto-creates a "Default" space and "main" branch for immediate use.
   * This reduces onboarding friction by allowing users to start adding
   * translations right after project creation.
   *
   * @param input - Project creation data
   * @returns Project with languages
   * @throws FieldValidationError if slug already exists
   * @throws ValidationError if default language not in language codes
   */
  async create(input: CreateProjectInput): Promise<ProjectWithLanguages> {
    // Validate default language is in language codes
    if (!input.languageCodes.includes(input.defaultLanguage)) {
      throw new ValidationError(
        'Default language must be included in language codes'
      );
    }

    // Check for duplicate slug
    const existing = await this.prisma.project.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new FieldValidationError(
        [
          {
            field: 'slug',
            message: 'A project with this slug already exists',
            code: UNIQUE_VIOLATION_CODES.PROJECT_SLUG,
          },
        ],
        'Project slug already exists'
      );
    }

    // Create project with languages, owner membership, and default space+branch
    // Using transaction to ensure all operations succeed together
    const project = await this.prisma.$transaction(async (tx) => {
      // 1. Create project with languages and owner membership
      const newProject = await tx.project.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          defaultLanguage: input.defaultLanguage,
          languages: {
            create: input.languageCodes.map((code) => ({
              code,
              name: LANGUAGE_NAMES[code] || code,
              isDefault: code === input.defaultLanguage,
            })),
          },
          members: {
            create: {
              userId: input.userId,
              role: ProjectRole.OWNER,
            },
          },
        },
        include: {
          languages: true,
        },
      });

      // 2. Auto-create default space
      const defaultSpace = await tx.space.create({
        data: {
          name: 'Default',
          slug: 'default',
          description: 'Default translation space',
          projectId: newProject.id,
        },
      });

      // 3. Auto-create main branch in default space
      await tx.branch.create({
        data: {
          name: 'main',
          slug: 'main',
          spaceId: defaultSpace.id,
          isDefault: true,
        },
      });

      return newProject;
    });

    return project;
  }

  /**
   * Find project by ID
   *
   * @param id - Project ID
   * @returns Project with languages or null
   */
  async findById(id: string): Promise<ProjectWithLanguages | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        languages: true,
      },
    });
  }

  /**
   * Find project by slug
   *
   * @param slug - Project slug
   * @returns Project with languages or null
   */
  async findBySlug(slug: string): Promise<ProjectWithLanguages | null> {
    return this.prisma.project.findUnique({
      where: { slug },
      include: {
        languages: true,
      },
    });
  }

  /**
   * Find project by ID or slug (flexible lookup)
   *
   * Tries slug first (shorter/cleaner), then falls back to ID.
   * This allows both clean URLs with slugs and backwards compatibility with IDs.
   *
   * @param idOrSlug - Project ID or slug
   * @returns Project with languages or null
   */
  async findByIdOrSlug(idOrSlug: string): Promise<ProjectWithLanguages | null> {
    // Try slug first (more common in URLs)
    const bySlug = await this.findBySlug(idOrSlug);
    if (bySlug) return bySlug;

    // Fall back to ID
    return this.findById(idOrSlug);
  }

  /**
   * Find all projects for a user
   *
   * @param userId - User ID
   * @returns Array of projects with languages
   */
  async findByUserId(userId: string): Promise<ProjectWithLanguages[]> {
    return this.prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        languages: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Find all projects for a user with embedded statistics.
   * Uses efficient aggregation to avoid N+1 queries.
   *
   * @param userId - User ID
   * @returns Array of projects with languages and stats
   */
  async findByUserIdWithStats(userId: string): Promise<ProjectWithLanguagesAndStats[]> {
    // Get projects with languages and aggregate translation data
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        languages: true,
        spaces: {
          include: {
            branches: {
              where: { isDefault: true },
              include: {
                _count: {
                  select: { keys: true },
                },
                keys: {
                  include: {
                    _count: {
                      select: { translations: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate stats for each project
    return projects.map((project) => {
      let totalKeys = 0;
      let totalTranslations = 0;

      for (const space of project.spaces) {
        for (const branch of space.branches) {
          totalKeys += branch._count.keys;
          for (const key of branch.keys) {
            totalTranslations += key._count.translations;
          }
        }
      }

      const languageCount = project.languages.length;
      const totalPossibleTranslations = totalKeys * languageCount;
      const completionRate =
        totalPossibleTranslations > 0
          ? totalTranslations / totalPossibleTranslations
          : 0;

      // Return project without nested spaces data
      const { spaces: _spaces, ...projectData } = project;

      return {
        ...projectData,
        stats: {
          totalKeys,
          translatedKeys: totalTranslations,
          completionRate,
        },
      };
    });
  }

  /**
   * Update project
   *
   * @param id - Project ID
   * @param input - Update data
   * @returns Updated project with languages
   * @throws NotFoundError if project doesn't exist
   * @throws ValidationError if default language not in language codes
   */
  async update(
    id: string,
    input: UpdateProjectInput
  ): Promise<ProjectWithLanguages> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // If updating languages, validate default language
    if (input.languageCodes && input.defaultLanguage) {
      if (!input.languageCodes.includes(input.defaultLanguage)) {
        throw new ValidationError(
          'Default language must be included in language codes'
        );
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      description?: string;
      defaultLanguage?: string;
    } = {};
    if (input.name) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.defaultLanguage) updateData.defaultLanguage = input.defaultLanguage;

    // Handle language updates
    if (input.languageCodes) {
      // Delete existing languages and recreate
      await this.prisma.projectLanguage.deleteMany({
        where: { projectId: id },
      });

      await this.prisma.projectLanguage.createMany({
        data: input.languageCodes.map((code) => ({
          projectId: id,
          code,
          name: LANGUAGE_NAMES[code] || code,
          isDefault:
            code === (input.defaultLanguage || project.defaultLanguage),
        })),
      });
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        languages: true,
      },
    });

    return updated;
  }

  /**
   * Delete project
   *
   * @param id - Project ID
   * @throws NotFoundError if project doesn't exist
   */
  async delete(id: string): Promise<void> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundError('Project');
    }

    await this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Get project statistics
   *
   * @param id - Project ID
   * @returns Project statistics including spaces, keys, and translation coverage
   * @throws NotFoundError if project doesn't exist
   */
  async getStats(id: string): Promise<ProjectStats> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        languages: true,
        spaces: {
          include: {
            branches: {
              where: { isDefault: true },
              include: {
                keys: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }

    // Calculate stats
    let totalKeys = 0;
    const translationsByLanguage: Record<
      string,
      { translated: number; total: number; percentage: number }
    > = {};

    // Initialize language stats
    for (const lang of project.languages) {
      translationsByLanguage[lang.code] = {
        translated: 0,
        total: 0,
        percentage: 0,
      };
    }

    // Count keys and translations from default branches
    for (const space of project.spaces) {
      for (const branch of space.branches) {
        totalKeys += branch.keys.length;

        for (const key of branch.keys) {
          for (const lang of project.languages) {
            translationsByLanguage[lang.code].total++;
            const hasTranslation = key.translations.some(
              (t) => t.language === lang.code && t.value
            );
            if (hasTranslation) {
              translationsByLanguage[lang.code].translated++;
            }
          }
        }
      }
    }

    // Calculate percentages
    for (const lang of project.languages) {
      const stats = translationsByLanguage[lang.code];
      stats.percentage =
        stats.total > 0
          ? Math.round((stats.translated / stats.total) * 100)
          : 0;
    }

    return {
      id: project.id,
      name: project.name,
      spaces: project.spaces.length,
      totalKeys,
      translationsByLanguage,
    };
  }

  /**
   * Check if user is a member of project
   *
   * @param projectId - Project ID
   * @param userId - User ID
   * @returns true if user is a member
   */
  async checkMembership(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    return !!member;
  }

  /**
   * Get user's role in project
   *
   * @param projectId - Project ID
   * @param userId - User ID
   * @returns User's role or null if not a member
   */
  async getMemberRole(
    projectId: string,
    userId: string
  ): Promise<ProjectRole | null> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    return member?.role || null;
  }
}
