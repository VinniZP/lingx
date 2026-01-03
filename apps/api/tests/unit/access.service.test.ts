/**
 * AccessService Unit Tests
 *
 * Tests authorization and access control for resources.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AccessService } from '../../src/services/access.service.js';
import type { PrismaClient } from '@prisma/client';

function createMockPrisma(): PrismaClient {
  return {
    translation: {
      findUnique: vi.fn(),
    },
    branch: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaClient;
}

describe('AccessService', () => {
  let service: AccessService;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new AccessService(mockPrisma);
  });

  describe('verifyTranslationAccess', () => {
    it('should pass when user is project member', async () => {
      (mockPrisma.translation.findUnique as Mock).mockResolvedValue({
        key: {
          branch: {
            space: {
              project: {
                members: [{ userId: 'user-1' }],
              },
            },
          },
        },
      });

      await expect(
        service.verifyTranslationAccess('user-1', 'trans-1')
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when translation does not exist', async () => {
      (mockPrisma.translation.findUnique as Mock).mockResolvedValue(null);

      await expect(
        service.verifyTranslationAccess('user-1', 'trans-1')
      ).rejects.toThrow('Translation');
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      (mockPrisma.translation.findUnique as Mock).mockResolvedValue({
        key: {
          branch: {
            space: {
              project: {
                members: [],
              },
            },
          },
        },
      });

      await expect(
        service.verifyTranslationAccess('user-1', 'trans-1')
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('verifyBranchAccess', () => {
    it('should return project info when user is project member', async () => {
      (mockPrisma.branch.findUnique as Mock).mockResolvedValue({
        space: {
          project: {
            id: 'proj-1',
            defaultLanguage: 'en',
            languages: [{ code: 'en' }, { code: 'de' }, { code: 'fr' }],
            members: [{ userId: 'user-1' }],
          },
        },
      });

      const result = await service.verifyBranchAccess('user-1', 'branch-1');

      expect(result).toEqual({
        projectId: 'proj-1',
        defaultLanguage: 'en',
        languages: ['en', 'de', 'fr'],
      });
    });

    it('should throw NotFoundError when branch does not exist', async () => {
      (mockPrisma.branch.findUnique as Mock).mockResolvedValue(null);

      await expect(
        service.verifyBranchAccess('user-1', 'branch-1')
      ).rejects.toThrow('Branch');
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      (mockPrisma.branch.findUnique as Mock).mockResolvedValue({
        space: {
          project: {
            id: 'proj-1',
            defaultLanguage: 'en',
            languages: [],
            members: [],
          },
        },
      });

      await expect(
        service.verifyBranchAccess('user-1', 'branch-1')
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('verifyProjectAccess', () => {
    it('should return role when user is project member', async () => {
      (mockPrisma.projectMember.findUnique as Mock).mockResolvedValue({
        role: 'DEVELOPER',
      });

      const result = await service.verifyProjectAccess('user-1', 'proj-1');

      expect(result).toEqual({ role: 'DEVELOPER' });
    });

    it('should pass when user has required role', async () => {
      (mockPrisma.projectMember.findUnique as Mock).mockResolvedValue({
        role: 'OWNER',
      });

      const result = await service.verifyProjectAccess('user-1', 'proj-1', [
        'OWNER',
        'MANAGER',
      ]);

      expect(result).toEqual({ role: 'OWNER' });
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      (mockPrisma.projectMember.findUnique as Mock).mockResolvedValue(null);

      await expect(
        service.verifyProjectAccess('user-1', 'proj-1')
      ).rejects.toThrow('Not authorized');
    });

    it('should throw ForbiddenError when user lacks required role', async () => {
      (mockPrisma.projectMember.findUnique as Mock).mockResolvedValue({
        role: 'DEVELOPER',
      });

      await expect(
        service.verifyProjectAccess('user-1', 'proj-1', ['OWNER', 'MANAGER'])
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});
