/**
 * Dashboard Repository
 *
 * Data access layer for dashboard statistics.
 * Encapsulates all Prisma queries for the dashboard domain.
 *
 * Data Model Hierarchy:
 *   User -> ProjectMember (many-to-many via ProjectMember join table)
 *   Project -> Space (one-to-many)
 *   Space -> Branch (one-to-many)
 *   Branch -> TranslationKey (one-to-many)
 *   TranslationKey -> Translation (one-to-many, one per language)
 *
 * Stats are calculated by:
 *   1. Finding all projects where user is a member
 *   2. Traversing down to all branches in those projects
 *   3. Aggregating keys and translations across all branches
 */
import type { DashboardStats } from '@lingx/shared';
import type { PrismaClient } from '@prisma/client';

export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get aggregate dashboard statistics for a user.
   * Calculates stats across all projects the user is a member of.
   */
  async getStatsForUser(userId: string): Promise<DashboardStats> {
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
        pendingApprovalCount: 0,
      };
    }

    const [projectCount, languageStats, keyStats] = await Promise.all([
      this.getProjectCount(projectIds),
      this.getUniqueLanguages(projectIds),
      this.getKeyAndTranslationStats(projectIds),
    ]);

    const totalLanguages = languageStats.length;
    const { totalKeys, totalTranslations, translatedKeys, pendingApprovalCount } = keyStats;

    // Completion rate = ratio of non-empty translations to all possible translations
    // Formula: totalTranslations / (totalKeys * totalLanguages)
    // Result is a decimal (0.0 to 1.0) representing the fraction of translation coverage
    const maxTranslations = totalKeys * totalLanguages;
    const completionRate = maxTranslations > 0 ? totalTranslations / maxTranslations : 0;

    return {
      totalProjects: projectCount,
      totalKeys,
      totalLanguages,
      completionRate,
      translatedKeys,
      totalTranslations,
      pendingApprovalCount,
    };
  }

  /**
   * Count projects for given project IDs.
   */
  private async getProjectCount(projectIds: string[]): Promise<number> {
    return this.prisma.project.count({
      where: { id: { in: projectIds } },
    });
  }

  /**
   * Get unique language codes across all specified projects.
   * Returns deduplicated language codes using Prisma's distinct.
   * Example: Projects with ['en','es'] and ['en','fr'] -> ['en','es','fr'] (3 unique codes)
   */
  private async getUniqueLanguages(projectIds: string[]): Promise<Array<{ code: string }>> {
    return this.prisma.projectLanguage.findMany({
      where: { projectId: { in: projectIds } },
      select: { code: true },
      distinct: ['code'],
    });
  }

  /**
   * Get key and translation statistics across multiple projects.
   * Uses nested relations to query branches directly from projects (avoiding N+1).
   * Traverses Project -> Space -> Branch -> TranslationKey -> Translation hierarchy.
   */
  private async getKeyAndTranslationStats(projectIds: string[]): Promise<{
    totalKeys: number;
    totalTranslations: number;
    translatedKeys: number;
    pendingApprovalCount: number;
  }> {
    // Single query to get all branches across all projects using nested relations
    // This avoids the N+1 pattern of: projects -> spaces -> branches
    const branches = await this.prisma.branch.findMany({
      where: {
        space: {
          projectId: { in: projectIds },
        },
      },
      select: { id: true },
    });

    const branchIds = branches.map((b) => b.id);

    if (branchIds.length === 0) {
      return { totalKeys: 0, totalTranslations: 0, translatedKeys: 0, pendingApprovalCount: 0 };
    }

    const [totalKeys, totalTranslations, keysWithTranslations, pendingApprovalCount] =
      await Promise.all([
        this.prisma.translationKey.count({
          where: { branchId: { in: branchIds } },
        }),

        // Count non-empty translations only (empty strings represent untranslated keys)
        this.prisma.translation.count({
          where: {
            key: { branchId: { in: branchIds } },
            value: { not: '' },
          },
        }),

        // Count keys that have at least one non-empty translation
        this.prisma.translationKey.count({
          where: {
            branchId: { in: branchIds },
            translations: {
              some: {
                value: { not: '' },
              },
            },
          },
        }),

        // Count translations awaiting review (PENDING status with content)
        // Approval workflow: PENDING -> APPROVED or REJECTED
        this.prisma.translation.count({
          where: {
            key: { branchId: { in: branchIds } },
            status: 'PENDING',
            value: { not: '' },
          },
        }),
      ]);

    return {
      totalKeys,
      totalTranslations,
      translatedKeys: keysWithTranslations,
      pendingApprovalCount,
    };
  }
}
