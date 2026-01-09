/**
 * Project Repository
 *
 * Data access layer for project operations.
 * Encapsulates all Prisma queries for the project domain.
 */
import type { PrismaClient, Project, ProjectRole } from '@prisma/client';

/**
 * Project with languages for API responses.
 */
export interface ProjectWithLanguages extends Project {
  languages: Array<{
    id: string;
    code: string;
    name: string;
    isDefault: boolean;
  }>;
}

/**
 * Project with stats and role for list endpoint.
 */
export interface ProjectWithStatsAndRole {
  project: ProjectWithLanguages & {
    stats: {
      totalKeys: number;
      translatedKeys: number;
      completionRate: number;
    };
  };
  role: ProjectRole;
}

/**
 * Project statistics response.
 */
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

/**
 * Project tree node for navigation.
 */
export interface ProjectTree {
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
      keyCount: number;
    }>;
  }>;
}

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

/**
 * Input for creating a project.
 */
export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  languageCodes: string[];
  defaultLanguage: string;
  userId: string;
}

/**
 * Input for updating a project.
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  languageCodes?: string[];
  defaultLanguage?: string;
}

export class ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find project by ID with languages.
   */
  async findById(id: string): Promise<ProjectWithLanguages | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: { languages: true },
    });
  }

  /**
   * Find project by slug with languages.
   */
  async findBySlug(slug: string): Promise<ProjectWithLanguages | null> {
    return this.prisma.project.findUnique({
      where: { slug },
      include: { languages: true },
    });
  }

  /**
   * Find project by ID or slug (flexible lookup).
   * Tries slug first (cleaner URLs), then falls back to ID.
   */
  async findByIdOrSlug(idOrSlug: string): Promise<ProjectWithLanguages | null> {
    const bySlug = await this.findBySlug(idOrSlug);
    if (bySlug) return bySlug;
    return this.findById(idOrSlug);
  }

  /**
   * Check if a project with the given slug exists.
   */
  async existsBySlug(slug: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });
    return project !== null;
  }

  /**
   * Get user's role in a project.
   */
  async getMemberRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });
    return member?.role ?? null;
  }

  /**
   * Check if user is a member of a project.
   */
  async checkMembership(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });
    return !!member;
  }

  /**
   * Find all projects for a user with stats and roles.
   */
  async findByUserIdWithStats(userId: string): Promise<ProjectWithStatsAndRole[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        languages: true,
        members: {
          where: { userId },
          select: { role: true },
        },
        spaces: {
          include: {
            branches: {
              where: { isDefault: true },
              include: {
                _count: { select: { keys: true } },
                keys: {
                  include: {
                    _count: { select: { translations: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

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
        totalPossibleTranslations > 0 ? totalTranslations / totalPossibleTranslations : 0;

      const { spaces: _spaces, members, ...projectData } = project;
      const role = members[0]?.role ?? 'DEVELOPER';

      return {
        project: {
          ...projectData,
          stats: {
            totalKeys,
            translatedKeys: totalTranslations,
            completionRate,
          },
        },
        role,
      };
    });
  }

  /**
   * Create a new project with languages, owner membership, and default space+branch.
   */
  async create(input: CreateProjectInput): Promise<ProjectWithLanguages> {
    return this.prisma.$transaction(async (tx) => {
      // Create project with languages and owner membership
      const project = await tx.project.create({
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
              role: 'OWNER',
            },
          },
        },
        include: { languages: true },
      });

      // Auto-create default space
      const defaultSpace = await tx.space.create({
        data: {
          name: 'Default',
          slug: 'default',
          description: 'Default translation space',
          projectId: project.id,
        },
      });

      // Auto-create main branch
      await tx.branch.create({
        data: {
          name: 'main',
          slug: 'main',
          spaceId: defaultSpace.id,
          isDefault: true,
        },
      });

      return project;
    });
  }

  /**
   * Update a project.
   *
   * NOTE: Caller must verify project exists before calling.
   * If project doesn't exist, Prisma will throw P2025 error.
   * The UpdateProjectHandler already performs this check via findByIdOrSlug.
   */
  async update(id: string, input: UpdateProjectInput): Promise<ProjectWithLanguages> {
    // Get current project for default language fallback
    const current = await this.findById(id);

    // Handle language updates
    if (input.languageCodes) {
      await this.prisma.projectLanguage.deleteMany({ where: { projectId: id } });
      await this.prisma.projectLanguage.createMany({
        data: input.languageCodes.map((code) => ({
          projectId: id,
          code,
          name: LANGUAGE_NAMES[code] || code,
          isDefault: code === (input.defaultLanguage || current?.defaultLanguage),
        })),
      });
    }

    // Build update data
    const updateData: { name?: string; description?: string; defaultLanguage?: string } = {};
    if (input.name) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.defaultLanguage) updateData.defaultLanguage = input.defaultLanguage;

    return this.prisma.project.update({
      where: { id },
      data: updateData,
      include: { languages: true },
    });
  }

  /**
   * Delete a project.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  /**
   * Get project statistics.
   */
  async getStats(id: string): Promise<ProjectStats | null> {
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
                  include: { translations: true },
                },
              },
            },
          },
        },
      },
    });

    if (!project) return null;

    let totalKeys = 0;
    const translationsByLanguage: ProjectStats['translationsByLanguage'] = {};

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
      stats.percentage = stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;
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
   * Get project navigation tree.
   */
  async getTree(id: string): Promise<ProjectTree | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        spaces: {
          select: {
            id: true,
            name: true,
            slug: true,
            branches: {
              select: {
                id: true,
                name: true,
                slug: true,
                isDefault: true,
                _count: { select: { keys: true } },
              },
              orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) return null;

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
}
