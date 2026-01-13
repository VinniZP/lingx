/**
 * Activity Repository
 *
 * Data access layer for activity operations.
 * Encapsulates all Prisma queries for the activity domain.
 */
import type { Activity, ActivityChange, ActivityMetadata } from '@lingx/shared';
import type { PrismaClient } from '@prisma/client';

/**
 * Pagination options for activity queries.
 */
export interface ActivityPaginationOptions {
  limit?: number;
  cursor?: string;
}

/**
 * Result type for paginated activities.
 */
export interface PaginatedActivities {
  activities: Activity[];
  nextCursor?: string;
}

/**
 * Result type for paginated activity changes.
 */
export interface PaginatedActivityChanges {
  changes: ActivityChange[];
  nextCursor?: string;
  total: number;
}

export class ActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find activity by ID.
   */
  async findById(id: string): Promise<{ id: string; projectId: string } | null> {
    return this.prisma.activity.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });
  }

  /**
   * Find recent activities for a user across all their projects.
   * Used by the dashboard activity feed.
   */
  async findUserActivities(
    userId: string,
    options?: ActivityPaginationOptions
  ): Promise<PaginatedActivities> {
    const limit = Math.min(options?.limit || 10, 50);

    // Get all projects the user is a member of
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = projectMembers.map((pm) => pm.projectId);

    if (projectIds.length === 0) {
      return { activities: [] };
    }

    // Build cursor condition
    const cursorCondition = options?.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {};

    // Get activities from these projects
    const activities = await this.prisma.activity.findMany({
      where: {
        projectId: { in: projectIds },
        ...cursorCondition,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = activities.length > limit;
    const results = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : undefined;

    return {
      activities: results.map((a) => this.mapActivityToResponse(a)),
      nextCursor,
    };
  }

  /**
   * Find recent activities for a specific project.
   * Used by the project details page activity feed.
   */
  async findProjectActivities(
    projectId: string,
    options?: ActivityPaginationOptions
  ): Promise<PaginatedActivities> {
    const limit = Math.min(options?.limit || 10, 50);

    // Build cursor condition
    const cursorCondition = options?.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {};

    const activities = await this.prisma.activity.findMany({
      where: {
        projectId,
        ...cursorCondition,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = activities.length > limit;
    const results = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : undefined;

    return {
      activities: results.map((a) => this.mapActivityToResponse(a)),
      nextCursor,
    };
  }

  /**
   * Find full audit trail for a specific activity.
   * Used for the "View all changes" modal.
   */
  async findActivityChanges(
    activityId: string,
    options?: ActivityPaginationOptions
  ): Promise<PaginatedActivityChanges> {
    const limit = Math.min(options?.limit || 20, 100);

    // Build cursor condition using compound cursor (createdAt|id)
    // This handles items with identical timestamps correctly
    // Using | as delimiter since : appears in ISO timestamps
    let cursorCondition = {};
    if (options?.cursor) {
      const delimiterIndex = options.cursor.lastIndexOf('|');
      if (delimiterIndex > 0) {
        const timestamp = options.cursor.substring(0, delimiterIndex);
        const cursorId = options.cursor.substring(delimiterIndex + 1);
        const cursorDate = new Date(timestamp);
        cursorCondition = {
          OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: cursorId } }],
        };
      }
    }

    const [changes, total] = await Promise.all([
      this.prisma.activityChange.findMany({
        where: {
          activityId,
          ...cursorCondition,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      this.prisma.activityChange.count({
        where: { activityId },
      }),
    ]);

    const hasMore = changes.length > limit;
    const results = hasMore ? changes.slice(0, limit) : changes;
    const lastItem = results[results.length - 1];
    const nextCursor = hasMore ? `${lastItem.createdAt.toISOString()}|${lastItem.id}` : undefined;

    return {
      changes: results.map((c) => ({
        id: c.id,
        activityId: c.activityId,
        entityType: c.entityType,
        entityId: c.entityId,
        keyName: c.keyName || undefined,
        language: c.language || undefined,
        oldValue: c.oldValue || undefined,
        newValue: c.newValue || undefined,
        createdAt: c.createdAt.toISOString(),
      })),
      nextCursor,
      total,
    };
  }

  /**
   * Map Prisma activity to API response.
   */
  private mapActivityToResponse(
    activity: Awaited<ReturnType<typeof this.prisma.activity.findFirst>> & {
      user: { id: string; name: string | null; email: string };
      project: { id: string; name: string } | null;
      branch: { id: string; name: string } | null;
    }
  ): Activity {
    return {
      id: activity.id,
      projectId: activity.projectId,
      projectName: activity.project?.name,
      branchId: activity.branchId,
      branchName: activity.branch?.name,
      userId: activity.userId,
      userName: activity.user.name || activity.user.email.split('@')[0],
      type: activity.type,
      count: activity.count,
      metadata: activity.metadata as ActivityMetadata,
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
