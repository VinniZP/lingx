/**
 * Dashboard Service
 *
 * Provides aggregate statistics for the user's dashboard.
 * Optimized for a single efficient query instead of N+1 pattern.
 */
import { PrismaClient } from '@prisma/client';
import type { DashboardStats } from '@localeflow/shared';

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get aggregate dashboard statistics for a user.
   *
   * Calculates:
   * - Total projects the user has access to
   * - Total translation keys across all projects
   * - Total unique languages
   * - Overall completion rate
   * - Number of translated keys
   * - Total translations
   *
   * @param userId - The user ID to get stats for
   * @returns Dashboard statistics
   */
  async getStats(userId: string): Promise<DashboardStats> {
    // Get all projects the user is a member of
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = projectMembers.map((pm) => pm.projectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalKeys: 0,
        totalLanguages: 0,
        completionRate: 0,
        translatedKeys: 0,
        totalTranslations: 0,
      };
    }

    // Get aggregate stats in parallel
    const [projectCount, languageStats, keyStats] = await Promise.all([
      // Count projects
      this.prisma.project.count({
        where: { id: { in: projectIds } },
      }),

      // Get unique languages across all projects
      this.prisma.projectLanguage.findMany({
        where: { projectId: { in: projectIds } },
        select: { code: true },
        distinct: ['code'],
      }),

      // Get key and translation counts
      this.getKeyAndTranslationStats(projectIds),
    ]);

    const totalLanguages = languageStats.length;
    const { totalKeys, totalTranslations, translatedKeys } = keyStats;

    // Calculate completion rate
    // Completion = total translations / (total keys * total languages)
    const maxTranslations = totalKeys * totalLanguages;
    const completionRate = maxTranslations > 0 ? totalTranslations / maxTranslations : 0;

    return {
      totalProjects: projectCount,
      totalKeys,
      totalLanguages,
      completionRate,
      translatedKeys,
      totalTranslations,
    };
  }

  /**
   * Get key and translation statistics across multiple projects.
   * Uses efficient aggregation queries.
   */
  private async getKeyAndTranslationStats(
    projectIds: string[]
  ): Promise<{
    totalKeys: number;
    totalTranslations: number;
    translatedKeys: number;
  }> {
    // Get all branches for these projects (we count keys from all branches)
    // For simplicity, we'll count from the default branches
    const spaces = await this.prisma.space.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });

    const spaceIds = spaces.map((s) => s.id);

    if (spaceIds.length === 0) {
      return { totalKeys: 0, totalTranslations: 0, translatedKeys: 0 };
    }

    // Get branches for these spaces
    const branches = await this.prisma.branch.findMany({
      where: { spaceId: { in: spaceIds } },
      select: { id: true },
    });

    const branchIds = branches.map((b) => b.id);

    if (branchIds.length === 0) {
      return { totalKeys: 0, totalTranslations: 0, translatedKeys: 0 };
    }

    // Count total keys
    const totalKeys = await this.prisma.translationKey.count({
      where: { branchId: { in: branchIds } },
    });

    // Count total non-empty translations
    const totalTranslations = await this.prisma.translation.count({
      where: {
        key: { branchId: { in: branchIds } },
        value: { not: '' },
      },
    });

    // Count keys that have at least one translation
    const keysWithTranslations = await this.prisma.translationKey.count({
      where: {
        branchId: { in: branchIds },
        translations: {
          some: {
            value: { not: '' },
          },
        },
      },
    });

    return {
      totalKeys,
      totalTranslations,
      translatedKeys: keysWithTranslations,
    };
  }
}
