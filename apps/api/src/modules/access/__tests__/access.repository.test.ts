/**
 * AccessRepository Unit Tests
 *
 * Tests data access methods for authorization checks.
 * Repository returns raw data; authorization logic is in AccessService.
 */

import type { PrismaClient, ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessRepository } from '../access.repository.js';

describe('AccessRepository', () => {
  const mockPrisma = {
    translation: {
      findUnique: vi.fn(),
    },
    translationKey: {
      findUnique: vi.fn(),
    },
    branch: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
  };

  const createRepository = () => new AccessRepository(mockPrisma as unknown as PrismaClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findTranslationWithMembership', () => {
    it('should return translation with membership info when found', async () => {
      const repository = createRepository();

      const mockTranslation = {
        key: {
          branch: {
            space: {
              project: {
                members: [{ userId: 'user-1' }],
              },
            },
          },
        },
      };

      mockPrisma.translation.findUnique.mockResolvedValue(mockTranslation);

      const result = await repository.findTranslationWithMembership('trans-1', 'user-1');

      expect(mockPrisma.translation.findUnique).toHaveBeenCalledWith({
        where: { id: 'trans-1' },
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
                            where: { userId: 'user-1' },
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
      expect(result).toEqual(mockTranslation);
    });

    it('should return null when translation not found', async () => {
      const repository = createRepository();

      mockPrisma.translation.findUnique.mockResolvedValue(null);

      const result = await repository.findTranslationWithMembership('nonexistent', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findKeyWithMembership', () => {
    it('should return key with membership info when found', async () => {
      const repository = createRepository();

      const mockKey = {
        branch: {
          space: {
            project: {
              members: [{ userId: 'user-1' }],
            },
          },
        },
      };

      mockPrisma.translationKey.findUnique.mockResolvedValue(mockKey);

      const result = await repository.findKeyWithMembership('key-1', 'user-1');

      expect(mockPrisma.translationKey.findUnique).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        select: {
          branch: {
            select: {
              space: {
                select: {
                  project: {
                    select: {
                      members: {
                        where: { userId: 'user-1' },
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
      expect(result).toEqual(mockKey);
    });

    it('should return null when key not found', async () => {
      const repository = createRepository();

      mockPrisma.translationKey.findUnique.mockResolvedValue(null);

      const result = await repository.findKeyWithMembership('nonexistent', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findKeyInBranchWithMembership', () => {
    it('should return key with info when found and belongs to branch', async () => {
      const repository = createRepository();

      const mockKey = {
        id: 'key-1',
        name: 'greeting.hello',
        namespace: 'common',
        branchId: 'branch-1',
        branch: {
          space: {
            project: {
              members: [{ userId: 'user-1' }],
            },
          },
        },
      };

      mockPrisma.translationKey.findUnique.mockResolvedValue(mockKey);

      const result = await repository.findKeyInBranchWithMembership('key-1', 'branch-1', 'user-1');

      expect(mockPrisma.translationKey.findUnique).toHaveBeenCalledWith({
        where: { id: 'key-1' },
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
                        where: { userId: 'user-1' },
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
      expect(result).toEqual(mockKey);
    });

    it('should return null when key not found', async () => {
      const repository = createRepository();

      mockPrisma.translationKey.findUnique.mockResolvedValue(null);

      const result = await repository.findKeyInBranchWithMembership(
        'nonexistent',
        'branch-1',
        'user-1'
      );

      expect(result).toBeNull();
    });
  });

  describe('findBranchWithMembership', () => {
    it('should return branch with project info when found', async () => {
      const repository = createRepository();

      const mockBranch = {
        space: {
          project: {
            id: 'proj-1',
            defaultLanguage: 'en',
            languages: [{ code: 'en' }, { code: 'de' }, { code: 'fr' }],
            members: [{ userId: 'user-1' }],
          },
        },
      };

      mockPrisma.branch.findUnique.mockResolvedValue(mockBranch);

      const result = await repository.findBranchWithMembership('branch-1', 'user-1');

      expect(mockPrisma.branch.findUnique).toHaveBeenCalledWith({
        where: { id: 'branch-1' },
        select: {
          space: {
            select: {
              project: {
                select: {
                  id: true,
                  defaultLanguage: true,
                  languages: { select: { code: true } },
                  members: {
                    where: { userId: 'user-1' },
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockBranch);
    });

    it('should return null when branch not found', async () => {
      const repository = createRepository();

      mockPrisma.branch.findUnique.mockResolvedValue(null);

      const result = await repository.findBranchWithMembership('nonexistent', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findProjectMembership', () => {
    it('should return membership with role when found', async () => {
      const repository = createRepository();

      const mockMembership = {
        role: 'DEVELOPER' as ProjectRole,
      };

      mockPrisma.projectMember.findUnique.mockResolvedValue(mockMembership);

      const result = await repository.findProjectMembership('proj-1', 'user-1');

      expect(mockPrisma.projectMember.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_userId: {
            projectId: 'proj-1',
            userId: 'user-1',
          },
        },
      });
      expect(result).toEqual(mockMembership);
    });

    it('should return null when membership not found', async () => {
      const repository = createRepository();

      mockPrisma.projectMember.findUnique.mockResolvedValue(null);

      const result = await repository.findProjectMembership('proj-1', 'user-1');

      expect(result).toBeNull();
    });
  });
});
