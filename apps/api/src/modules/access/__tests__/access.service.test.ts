/**
 * AccessService Unit Tests
 *
 * Tests authorization logic using mocked repository.
 * Service interprets repository results and throws appropriate errors.
 */

import type { ProjectRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessRepository } from '../access.repository.js';
import { AccessService, type KeyInfo, type ProjectInfo } from '../access.service.js';

describe('AccessService', () => {
  const mockRepository = {
    findTranslationWithMembership: vi.fn(),
    findKeyWithMembership: vi.fn(),
    findKeyInBranchWithMembership: vi.fn(),
    findBranchWithMembership: vi.fn(),
    findProjectMembership: vi.fn(),
  };

  const createService = () => new AccessService(mockRepository as unknown as AccessRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyTranslationAccess', () => {
    it('should pass when user is project member', async () => {
      const service = createService();

      mockRepository.findTranslationWithMembership.mockResolvedValue({
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

      await expect(service.verifyTranslationAccess('user-1', 'trans-1')).resolves.toBeUndefined();

      expect(mockRepository.findTranslationWithMembership).toHaveBeenCalledWith(
        'trans-1',
        'user-1'
      );
    });

    it('should throw NotFoundError when translation does not exist', async () => {
      const service = createService();

      mockRepository.findTranslationWithMembership.mockResolvedValue(null);

      await expect(service.verifyTranslationAccess('user-1', 'trans-1')).rejects.toThrow(
        'Translation'
      );
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      const service = createService();

      mockRepository.findTranslationWithMembership.mockResolvedValue({
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

      await expect(service.verifyTranslationAccess('user-1', 'trans-1')).rejects.toThrow(
        'Not authorized'
      );
    });
  });

  describe('verifyKeyAccess', () => {
    it('should pass when user is project member', async () => {
      const service = createService();

      mockRepository.findKeyWithMembership.mockResolvedValue({
        branch: {
          space: {
            project: {
              members: [{ userId: 'user-1' }],
            },
          },
        },
      });

      await expect(service.verifyKeyAccess('user-1', 'key-1')).resolves.toBeUndefined();

      expect(mockRepository.findKeyWithMembership).toHaveBeenCalledWith('key-1', 'user-1');
    });

    it('should throw NotFoundError when key does not exist', async () => {
      const service = createService();

      mockRepository.findKeyWithMembership.mockResolvedValue(null);

      await expect(service.verifyKeyAccess('user-1', 'key-1')).rejects.toThrow('Key');
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      const service = createService();

      mockRepository.findKeyWithMembership.mockResolvedValue({
        branch: {
          space: {
            project: {
              members: [],
            },
          },
        },
      });

      await expect(service.verifyKeyAccess('user-1', 'key-1')).rejects.toThrow('Not authorized');
    });
  });

  describe('verifyKeyInBranch', () => {
    it('should return key info when key exists and belongs to branch', async () => {
      const service = createService();

      mockRepository.findKeyInBranchWithMembership.mockResolvedValue({
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
      });

      const result = await service.verifyKeyInBranch('user-1', 'key-1', 'branch-1');

      expect(result).toEqual<KeyInfo>({
        id: 'key-1',
        name: 'greeting.hello',
        namespace: 'common',
      });
      expect(mockRepository.findKeyInBranchWithMembership).toHaveBeenCalledWith(
        'key-1',
        'branch-1',
        'user-1'
      );
    });

    it('should throw NotFoundError when key does not exist', async () => {
      const service = createService();

      mockRepository.findKeyInBranchWithMembership.mockResolvedValue(null);

      await expect(service.verifyKeyInBranch('user-1', 'key-1', 'branch-1')).rejects.toThrow('Key');
    });

    it('should throw NotFoundError when key does not belong to branch', async () => {
      const service = createService();

      mockRepository.findKeyInBranchWithMembership.mockResolvedValue({
        id: 'key-1',
        name: 'greeting.hello',
        namespace: null,
        branchId: 'other-branch',
        branch: {
          space: {
            project: {
              members: [{ userId: 'user-1' }],
            },
          },
        },
      });

      await expect(service.verifyKeyInBranch('user-1', 'key-1', 'branch-1')).rejects.toThrow('Key');
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      const service = createService();

      mockRepository.findKeyInBranchWithMembership.mockResolvedValue({
        id: 'key-1',
        name: 'greeting.hello',
        namespace: null,
        branchId: 'branch-1',
        branch: {
          space: {
            project: {
              members: [],
            },
          },
        },
      });

      await expect(service.verifyKeyInBranch('user-1', 'key-1', 'branch-1')).rejects.toThrow(
        'Not authorized'
      );
    });
  });

  describe('verifyBranchAccess', () => {
    it('should return project info when user is project member', async () => {
      const service = createService();

      mockRepository.findBranchWithMembership.mockResolvedValue({
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

      expect(result).toEqual<ProjectInfo>({
        projectId: 'proj-1',
        defaultLanguage: 'en',
        languages: ['en', 'de', 'fr'],
      });
      expect(mockRepository.findBranchWithMembership).toHaveBeenCalledWith('branch-1', 'user-1');
    });

    it('should throw NotFoundError when branch does not exist', async () => {
      const service = createService();

      mockRepository.findBranchWithMembership.mockResolvedValue(null);

      await expect(service.verifyBranchAccess('user-1', 'branch-1')).rejects.toThrow('Branch');
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      const service = createService();

      mockRepository.findBranchWithMembership.mockResolvedValue({
        space: {
          project: {
            id: 'proj-1',
            defaultLanguage: 'en',
            languages: [],
            members: [],
          },
        },
      });

      await expect(service.verifyBranchAccess('user-1', 'branch-1')).rejects.toThrow(
        'Not authorized'
      );
    });
  });

  describe('verifyProjectAccess', () => {
    it('should return role when user is project member', async () => {
      const service = createService();

      mockRepository.findProjectMembership.mockResolvedValue({
        role: 'DEVELOPER' as ProjectRole,
      });

      const result = await service.verifyProjectAccess('user-1', 'proj-1');

      expect(result).toEqual({ role: 'DEVELOPER' });
      expect(mockRepository.findProjectMembership).toHaveBeenCalledWith('proj-1', 'user-1');
    });

    it('should pass when user has required role', async () => {
      const service = createService();

      mockRepository.findProjectMembership.mockResolvedValue({
        role: 'OWNER' as ProjectRole,
      });

      const result = await service.verifyProjectAccess('user-1', 'proj-1', ['OWNER', 'MANAGER']);

      expect(result).toEqual({ role: 'OWNER' });
    });

    it('should throw ForbiddenError when user is not a project member', async () => {
      const service = createService();

      mockRepository.findProjectMembership.mockResolvedValue(null);

      await expect(service.verifyProjectAccess('user-1', 'proj-1')).rejects.toThrow(
        'Not authorized'
      );
    });

    it('should throw ForbiddenError when user lacks required role', async () => {
      const service = createService();

      mockRepository.findProjectMembership.mockResolvedValue({
        role: 'DEVELOPER' as ProjectRole,
      });

      await expect(
        service.verifyProjectAccess('user-1', 'proj-1', ['OWNER', 'MANAGER'])
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});
