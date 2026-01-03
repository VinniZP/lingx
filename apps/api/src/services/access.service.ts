/**
 * Access Service
 *
 * Handles authorization and access control for resources.
 * Verifies user membership and permissions for translations, branches, and projects.
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../plugins/error-handler.js';

export interface ProjectInfo {
  projectId: string;
  defaultLanguage: string;
  languages: string[];
}

export class AccessService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Verify user has access to a translation via project membership
   * @throws NotFoundError if translation doesn't exist
   * @throws ForbiddenError if user has no access
   */
  async verifyTranslationAccess(userId: string, translationId: string): Promise<void> {
    const translation = await this.prisma.translation.findUnique({
      where: { id: translationId },
      select: {
        key: {
          select: {
            branch: {
              select: {
                space: {
                  select: {
                    project: {
                      select: {
                        members: {
                          where: { userId },
                          select: { userId: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!translation) {
      throw new NotFoundError('Translation');
    }

    if (translation.key.branch.space.project.members.length === 0) {
      throw new ForbiddenError('Not authorized to access this translation');
    }
  }

  /**
   * Verify user has access to a translation key via project membership
   * @throws NotFoundError if key doesn't exist
   * @throws ForbiddenError if user has no access
   */
  async verifyKeyAccess(userId: string, keyId: string): Promise<void> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
      select: {
        branch: {
          select: {
            space: {
              select: {
                project: {
                  select: {
                    members: {
                      where: { userId },
                      select: { userId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!key) {
      throw new NotFoundError('Key');
    }

    if (key.branch.space.project.members.length === 0) {
      throw new ForbiddenError('Not authorized to access this key');
    }
  }

  /**
   * Verify user has access to a branch and return project info
   * @throws NotFoundError if branch doesn't exist
   * @throws ForbiddenError if user has no access
   */
  async verifyBranchAccess(userId: string, branchId: string): Promise<ProjectInfo> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        space: {
          select: {
            project: {
              select: {
                id: true,
                defaultLanguage: true,
                languages: { select: { code: true } },
                members: {
                  where: { userId },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    const project = branch.space.project;
    if (project.members.length === 0) {
      throw new ForbiddenError('Not authorized to access this branch');
    }

    return {
      projectId: project.id,
      defaultLanguage: project.defaultLanguage,
      languages: project.languages.map((l) => l.code),
    };
  }

  /**
   * Verify user has access to a project with optional role check
   * @throws ForbiddenError if user has no access or insufficient role
   */
  async verifyProjectAccess(
    userId: string,
    projectId: string,
    requiredRoles?: ProjectRole[]
  ): Promise<{ role: ProjectRole }> {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('Not authorized to access this project');
    }

    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenError('Insufficient permissions for this operation');
    }

    return { role: membership.role };
  }
}

export function createAccessService(prisma: PrismaClient): AccessService {
  return new AccessService(prisma);
}
