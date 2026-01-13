/**
 * Access Repository
 *
 * Data access layer for authorization checks.
 * Encapsulates all Prisma queries for membership verification.
 * Returns raw data without throwing errors - authorization logic is in AccessService.
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';

/**
 * Translation with nested membership info.
 */
export interface TranslationWithMembership {
  key: {
    branch: {
      space: {
        project: {
          members: Array<{ userId: string }>;
        };
      };
    };
  };
}

/**
 * Key with nested membership info.
 */
export interface KeyWithMembership {
  branch: {
    space: {
      project: {
        members: Array<{ userId: string }>;
      };
    };
  };
}

/**
 * Key with full info including branch ID and membership.
 */
export interface KeyInBranchWithMembership {
  id: string;
  name: string;
  namespace: string | null;
  branchId: string;
  branch: {
    space: {
      project: {
        members: Array<{ userId: string }>;
      };
    };
  };
}

/**
 * Branch with project info and membership.
 */
export interface BranchWithMembership {
  space: {
    project: {
      id: string;
      defaultLanguage: string;
      languages: Array<{ code: string }>;
      members: Array<{ userId: string }>;
    };
  };
}

/**
 * Project membership with role.
 */
export interface ProjectMembershipResult {
  role: ProjectRole;
}

export class AccessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find translation with membership info for the given user.
   * Returns null if translation doesn't exist.
   */
  async findTranslationWithMembership(
    translationId: string,
    userId: string
  ): Promise<TranslationWithMembership | null> {
    return this.prisma.translation.findUnique({
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
  }

  /**
   * Find key with membership info for the given user.
   * Returns null if key doesn't exist.
   */
  async findKeyWithMembership(keyId: string, userId: string): Promise<KeyWithMembership | null> {
    return this.prisma.translationKey.findUnique({
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
  }

  /**
   * Find key with full info including branch ID and membership.
   * Returns null if key doesn't exist.
   */
  async findKeyInBranchWithMembership(
    keyId: string,
    _branchId: string,
    userId: string
  ): Promise<KeyInBranchWithMembership | null> {
    return this.prisma.translationKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        name: true,
        namespace: true,
        branchId: true,
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
  }

  /**
   * Find branch with project info and membership.
   * Returns null if branch doesn't exist.
   */
  async findBranchWithMembership(
    branchId: string,
    userId: string
  ): Promise<BranchWithMembership | null> {
    return this.prisma.branch.findUnique({
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
  }

  /**
   * Find project membership for a user.
   * Returns null if user is not a member.
   */
  async findProjectMembership(
    projectId: string,
    userId: string
  ): Promise<ProjectMembershipResult | null> {
    return this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }
}
