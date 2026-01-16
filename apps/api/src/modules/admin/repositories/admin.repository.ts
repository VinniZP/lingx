/**
 * Admin Repository
 *
 * Data access layer for admin user management operations.
 * Encapsulates all Prisma queries for admin-related operations.
 */

import type { PrismaClient, Role } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface UserFilters {
  role?: Role;
  status?: 'active' | 'disabled';
  search?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  isDisabled: boolean;
  disabledAt: Date | null;
  createdAt: Date;
  _count: {
    projectMembers: number;
  };
}

export interface PaginatedUsers {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UserWithProjects {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  isDisabled: boolean;
  disabledAt: Date | null;
  createdAt: Date;
  disabledBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  projectMembers: Array<{
    role: string;
    project: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export interface UserActivity {
  id: string;
  projectId: string;
  type: string;
  metadata: unknown;
  count: number;
  createdAt: Date;
  project: {
    id: string;
    name: string;
    slug: string;
  };
}

// ============================================
// Repository
// ============================================

export class AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find all users with filters and pagination.
   * Returns users with their project counts.
   */
  async findAllUsers(filters: UserFilters, pagination: Pagination): Promise<PaginatedUsers> {
    const where = this.buildWhereClause(filters);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isDisabled: true,
          disabledAt: true,
          createdAt: true,
          _count: {
            select: { projectMembers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  /**
   * Find user by ID with projects and disabledBy info.
   */
  async findUserById(userId: string): Promise<UserWithProjects | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isDisabled: true,
        disabledAt: true,
        createdAt: true,
        disabledBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        projectMembers: {
          select: {
            role: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find recent activity for a user.
   */
  async findUserActivity(userId: string, limit: number): Promise<UserActivity[]> {
    return this.prisma.activity.findMany({
      where: { userId },
      select: {
        id: true,
        projectId: true,
        type: true,
        metadata: true,
        count: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Update user disabled status.
   * When disabling, sets disabledAt and disabledById.
   * When enabling, clears both fields.
   */
  async updateUserDisabled(
    userId: string,
    isDisabled: boolean,
    disabledById?: string
  ): Promise<{ id: string; isDisabled: boolean }> {
    return this.prisma.user.update({
      where: { id: userId },
      data: isDisabled
        ? {
            isDisabled: true,
            disabledAt: new Date(),
            disabledById,
          }
        : {
            isDisabled: false,
            disabledAt: null,
            disabledById: null,
          },
    });
  }

  /**
   * Anonymize user in activity logs.
   * Merges actorName: "Deleted User" into existing metadata for GDPR compliance.
   * Preserves other metadata fields while only updating the actor name.
   */
  async anonymizeUserActivity(userId: string): Promise<void> {
    // Fetch all activities to preserve existing metadata
    const activities = await this.prisma.activity.findMany({
      where: { userId },
      select: { id: true, metadata: true },
    });

    // Update each activity with merged metadata
    await Promise.all(
      activities.map((activity) =>
        this.prisma.activity.update({
          where: { id: activity.id },
          data: {
            metadata: {
              ...((activity.metadata as Record<string, unknown>) ?? {}),
              actorName: 'Deleted User',
            },
          },
        })
      )
    );
  }

  /**
   * Disable user with all side effects in a single transaction.
   * Ensures atomicity of: disable user, delete sessions, anonymize activity.
   */
  async disableUserTransaction(
    userId: string,
    disabledById: string
  ): Promise<{ sessionsDeleted: number }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Disable the user
      await tx.user.update({
        where: { id: userId },
        data: {
          isDisabled: true,
          disabledAt: new Date(),
          disabledById,
        },
      });

      // 2. Delete all sessions (immediate logout)
      const { count: sessionsDeleted } = await tx.session.deleteMany({
        where: { userId },
      });

      // 3. Anonymize user in activity logs (GDPR)
      const activities = await tx.activity.findMany({
        where: { userId },
        select: { id: true, metadata: true },
      });

      await Promise.all(
        activities.map((activity) =>
          tx.activity.update({
            where: { id: activity.id },
            data: {
              metadata: {
                ...((activity.metadata as Record<string, unknown>) ?? {}),
                actorName: 'Deleted User',
              },
            },
          })
        )
      );

      return { sessionsDeleted };
    });
  }

  /**
   * Get user's last active timestamp from sessions.
   */
  async getLastActiveAt(userId: string): Promise<Date | null> {
    const session = await this.prisma.session.findFirst({
      where: { userId },
      select: { lastActive: true },
      orderBy: { lastActive: 'desc' },
    });

    return session?.lastActive ?? null;
  }

  /**
   * Find user role by ID (for authorization checks).
   */
  async findUserRoleById(userId: string): Promise<Role | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? null;
  }

  /**
   * Check if user is disabled (for auth validation).
   */
  async isUserDisabled(userId: string): Promise<boolean | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isDisabled: true },
    });
    return user?.isDisabled ?? null;
  }

  /**
   * Build Prisma where clause from filters.
   */
  private buildWhereClause(filters: UserFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status === 'active') {
      where.isDisabled = false;
    } else if (filters.status === 'disabled') {
      where.isDisabled = true;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
