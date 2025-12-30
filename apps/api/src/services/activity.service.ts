/**
 * Activity Service
 *
 * Handles activity tracking and retrieval per ADR-0005.
 * Uses BullMQ for async activity logging with sequential session-based grouping.
 */
import { PrismaClient } from '@prisma/client';
import type {
  Activity,
  ActivityChange,
  CreateActivityInput,
  ActivityMetadata,
} from '@localeflow/shared';
import { activityQueue } from '../lib/queues.js';

/**
 * Session gap threshold for grouping (15 minutes)
 */
const SESSION_GAP_MS = 15 * 60 * 1000;

/**
 * Maximum preview items to store in metadata
 */
const MAX_PREVIEW_ITEMS = 10;

export class ActivityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log a new activity asynchronously via BullMQ queue.
   *
   * This method returns immediately (~1-2ms) after publishing to the queue.
   * The actual database write happens in the background worker with
   * sequential session-based grouping.
   *
   * @param input - Activity data to log
   */
  async log(input: CreateActivityInput): Promise<void> {
    await activityQueue.add(
      'log',
      {
        ...input,
        timestamp: Date.now(),
      },
      {
        // Delay slightly to allow batching of concurrent operations
        delay: 100,
      }
    );
  }

  /**
   * Get recent activities for a user across all their projects.
   * Used by the dashboard activity feed.
   *
   * @param userId - User ID
   * @param options - Query options (limit, cursor)
   * @returns Activities with project and user info
   */
  async getUserActivities(
    userId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ activities: Activity[]; nextCursor?: string }> {
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
    const cursorCondition = options?.cursor
      ? { createdAt: { lt: new Date(options.cursor) } }
      : {};

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
      take: limit + 1, // Fetch one extra to determine if there are more
    });

    const hasMore = activities.length > limit;
    const results = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : undefined;

    return {
      activities: results.map((a) => this.mapActivityToResponse(a)),
      nextCursor,
    };
  }

  /**
   * Get recent activities for a specific project.
   * Used by the project details page activity feed.
   *
   * @param projectId - Project ID
   * @param options - Query options (limit, cursor)
   * @returns Activities with user info
   */
  async getProjectActivities(
    projectId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ activities: Activity[]; nextCursor?: string }> {
    const limit = Math.min(options?.limit || 10, 50);

    // Build cursor condition
    const cursorCondition = options?.cursor
      ? { createdAt: { lt: new Date(options.cursor) } }
      : {};

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
    const nextCursor = hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : undefined;

    return {
      activities: results.map((a) => this.mapActivityToResponse(a)),
      nextCursor,
    };
  }

  /**
   * Get full audit trail for a specific activity.
   * Used for the "View all changes" modal.
   *
   * @param activityId - Activity ID
   * @param options - Query options (limit, cursor)
   * @returns Changes with pagination info
   */
  async getActivityChanges(
    activityId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ changes: ActivityChange[]; nextCursor?: string; total: number }> {
    const limit = Math.min(options?.limit || 20, 100);

    // Build cursor condition
    const cursorCondition = options?.cursor
      ? { createdAt: { lt: new Date(options.cursor) } }
      : {};

    const [changes, total] = await Promise.all([
      this.prisma.activityChange.findMany({
        where: {
          activityId,
          ...cursorCondition,
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.activityChange.count({
        where: { activityId },
      }),
    ]);

    const hasMore = changes.length > limit;
    const results = hasMore ? changes.slice(0, limit) : changes;
    const nextCursor = hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : undefined;

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
   * Generate a group key for activity grouping.
   * Uses 30-second time windows for groupable activity types.
   */
  static generateGroupKey(
    userId: string,
    projectId: string,
    type: string,
    branchId?: string,
    timestamp: Date = new Date()
  ): string {
    const windowSeconds = 30;
    const timeWindow = Math.floor(timestamp.getTime() / (windowSeconds * 1000));
    const branchPart = branchId || 'none';
    return `${userId}:${projectId}:${branchPart}:${type}:${timeWindow}`;
  }

  /**
   * Build preview items from changes (first 10 for hover display)
   */
  static buildPreview(
    changes: Array<{
      keyName?: string;
      language?: string;
      oldValue?: string;
      newValue?: string;
      entityId: string;
    }>
  ): { preview: ActivityMetadata['preview']; hasMore: boolean } {
    const preview = changes.slice(0, MAX_PREVIEW_ITEMS).map((c) => ({
      keyId: c.entityId,
      keyName: c.keyName || c.entityId,
      language: c.language,
      // Truncate values for preview
      oldValue: c.oldValue?.substring(0, 100),
      newValue: c.newValue?.substring(0, 100),
    }));

    return {
      preview,
      hasMore: changes.length > MAX_PREVIEW_ITEMS,
    };
  }

  /**
   * Map Prisma activity to API response
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

export { SESSION_GAP_MS, MAX_PREVIEW_ITEMS };
