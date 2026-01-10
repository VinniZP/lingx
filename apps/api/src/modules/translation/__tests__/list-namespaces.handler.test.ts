import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { ListNamespacesHandler } from '../queries/list-namespaces.handler.js';
import { ListNamespacesQuery } from '../queries/list-namespaces.query.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('ListNamespacesHandler', () => {
  const mockRepository: {
    getNamespaces: ReturnType<typeof vi.fn>;
  } = {
    getNamespaces: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
  };

  let handler: ListNamespacesHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ListNamespacesHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService
    );
  });

  it('should list namespaces with key counts', async () => {
    const query = new ListNamespacesQuery('branch-1', 'user-1');

    const mockNamespaces = [
      { namespace: null, count: 10 },
      { namespace: 'common', count: 5 },
      { namespace: 'errors', count: 3 },
    ];

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'es'],
    });
    mockRepository.getNamespaces.mockResolvedValue(mockNamespaces);

    const result = await handler.execute(query);

    expect(result).toEqual(mockNamespaces);
    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockRepository.getNamespaces).toHaveBeenCalledWith('branch-1');
  });

  it('should return empty array when no namespaces', async () => {
    const query = new ListNamespacesQuery('branch-1', 'user-1');

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockRepository.getNamespaces.mockResolvedValue([]);

    const result = await handler.execute(query);

    expect(result).toEqual([]);
  });

  it('should throw when user lacks branch access', async () => {
    const query = new ListNamespacesQuery('branch-1', 'user-1');

    mockAccessService.verifyBranchAccess.mockRejectedValue(new Error('Not authorized'));

    await expect(handler.execute(query)).rejects.toThrow('Not authorized');
    expect(mockRepository.getNamespaces).not.toHaveBeenCalled();
  });

  it('should handle branch with only root namespace', async () => {
    const query = new ListNamespacesQuery('branch-1', 'user-1');

    const mockNamespaces = [{ namespace: null, count: 25 }];

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockRepository.getNamespaces.mockResolvedValue(mockNamespaces);

    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].namespace).toBeNull();
    expect(result[0].count).toBe(25);
  });
});
