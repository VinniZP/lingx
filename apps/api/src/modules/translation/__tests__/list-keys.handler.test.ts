import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { ListKeysHandler } from '../queries/list-keys.handler.js';
import { ListKeysQuery } from '../queries/list-keys.query.js';
import type {
  KeyListResult,
  TranslationRepository,
} from '../repositories/translation.repository.js';

describe('ListKeysHandler', () => {
  const mockRepository: { findKeysByBranchId: ReturnType<typeof vi.fn> } = {
    findKeysByBranchId: vi.fn(),
  };

  const mockAccessService: { verifyBranchAccess: ReturnType<typeof vi.fn> } = {
    verifyBranchAccess: vi.fn(),
  };

  let handler: ListKeysHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ListKeysHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService
    );
  });

  it('should verify branch access before listing keys', async () => {
    const query = new ListKeysQuery('branch-1', 'user-1', {});

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });

    const mockResult: KeyListResult = {
      keys: [],
      total: 0,
      page: 1,
      limit: 50,
    };
    mockRepository.findKeysByBranchId.mockResolvedValue(mockResult);

    await handler.execute(query);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
  });

  it('should return paginated keys from repository', async () => {
    const query = new ListKeysQuery('branch-1', 'user-1', {
      page: 2,
      limit: 25,
      search: 'test',
    });

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });

    const mockResult: KeyListResult = {
      keys: [
        {
          id: 'key-1',
          name: 'test.key',
          namespace: null,
          description: null,
          branchId: 'branch-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          sourceFile: null,
          sourceLine: null,
          sourceComponent: null,
          translations: [],
        },
      ],
      total: 30,
      page: 2,
      limit: 25,
    };
    mockRepository.findKeysByBranchId.mockResolvedValue(mockResult);

    const result = await handler.execute(query);

    expect(mockRepository.findKeysByBranchId).toHaveBeenCalledWith('branch-1', {
      page: 2,
      limit: 25,
      search: 'test',
      filter: undefined,
      qualityFilter: undefined,
      namespace: undefined,
    });
    expect(result).toEqual(mockResult);
  });

  it('should pass filter options to repository', async () => {
    const query = new ListKeysQuery('branch-1', 'user-1', {
      filter: 'missing',
      namespace: 'common',
    });

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });

    const mockResult: KeyListResult = {
      keys: [],
      total: 0,
      page: 1,
      limit: 50,
    };
    mockRepository.findKeysByBranchId.mockResolvedValue(mockResult);

    await handler.execute(query);

    expect(mockRepository.findKeysByBranchId).toHaveBeenCalledWith('branch-1', {
      page: undefined,
      limit: undefined,
      search: undefined,
      filter: 'missing',
      qualityFilter: undefined,
      namespace: 'common',
    });
  });

  it('should throw when user lacks branch access', async () => {
    const query = new ListKeysQuery('branch-1', 'user-1', {});

    mockAccessService.verifyBranchAccess.mockRejectedValue(
      new Error('Not authorized to access this branch')
    );

    await expect(handler.execute(query)).rejects.toThrow('Not authorized to access this branch');
    expect(mockRepository.findKeysByBranchId).not.toHaveBeenCalled();
  });
});
