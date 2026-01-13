/**
 * Member Repository
 *
 * Data access layer for project member operations.
 * Encapsulates all Prisma queries for member-related operations.
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';

/** User details included with member records */
const userSelectFields = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

/** Include clause for user details in member queries */
const memberInclude = {
  user: {
    select: userSelectFields,
  },
} as const;

export interface ProjectMemberWithUser {
  userId: string;
  role: ProjectRole;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface UserBasic {
  id: string;
  email: string;
}

export class MemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find all members of a project with user details.
   * Results are sorted alphabetically by user name.
   */
  async findProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: memberInclude,
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });
  }

  /**
   * Find a specific member by user ID.
   */
  async findMemberByUserId(
    projectId: string,
    userId: string
  ): Promise<ProjectMemberWithUser | null> {
    return this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: memberInclude,
    });
  }

  /**
   * Update a member's role.
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectRole
  ): Promise<ProjectMemberWithUser> {
    return this.prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: { role },
      include: memberInclude,
    });
  }

  /**
   * Remove a member from a project.
   */
  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  /**
   * Count the number of OWNER members in a project.
   * Used for ownership validation (cannot remove last owner).
   */
  async countOwners(projectId: string): Promise<number> {
    return this.prisma.projectMember.count({
      where: {
        projectId,
        role: 'OWNER',
      },
    });
  }

  /**
   * Add a new member to a project.
   */
  async addMember(
    projectId: string,
    userId: string,
    role: ProjectRole
  ): Promise<ProjectMemberWithUser> {
    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
      include: memberInclude,
    });
  }

  /**
   * Find a user by email (for invitation acceptance).
   */
  async findUserByEmail(email: string): Promise<UserBasic | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  /**
   * Find a user by ID (for invitation acceptance).
   */
  async findUserById(userId: string): Promise<UserBasic | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }
}
