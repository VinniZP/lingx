import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { GetKeyHandler } from '../queries/get-key.handler.js';
import { GetKeyQuery } from '../queries/get-key.query.js';
import type {
  KeyWithTranslations,
  TranslationRepository,
} from '../repositories/translation.repository.js';

describe('GetKeyHandler', () => {
  const mockRepository: {
    findKeyById: ReturnType<typeof vi.fn>;
  } = {
    findKeyById: vi.fn(),
  };

  const mockAccessService: { verifyKeyAccess: ReturnType<typeof vi.fn> } = {
    verifyKeyAccess: vi.fn(),
  };

  let handler: GetKeyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetKeyHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService
    );
  });

  it('should verify key access before fetching', async () => {
    const query = new GetKeyQuery('key-1', 'user-1');

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);

    const mockKey: KeyWithTranslations = {
      id: 'key-1',
      name: 'test.key',
      namespace: null,
      description: 'A test key',
      branchId: 'branch-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceFile: null,
      sourceLine: null,
      sourceComponent: null,
      translations: [],
    };
    mockRepository.findKeyById.mockResolvedValue(mockKey);

    await handler.execute(query);

    expect(mockAccessService.verifyKeyAccess).toHaveBeenCalledWith('user-1', 'key-1');
  });

  it('should return key with translations', async () => {
    const query = new GetKeyQuery('key-1', 'user-1');

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);

    const mockKey: KeyWithTranslations = {
      id: 'key-1',
      name: 'test.key',
      namespace: 'common',
      description: 'A test key',
      branchId: 'branch-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceFile: 'src/App.tsx',
      sourceLine: 42,
      sourceComponent: 'App',
      translations: [
        {
          id: 'trans-1',
          keyId: 'key-1',
          language: 'en',
          value: 'Hello',
          status: 'APPROVED',
          statusUpdatedAt: new Date(),
          statusUpdatedBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          qualityScore: null,
        },
      ],
    };
    mockRepository.findKeyById.mockResolvedValue(mockKey);

    const result = await handler.execute(query);

    expect(mockRepository.findKeyById).toHaveBeenCalledWith('key-1');
    expect(result).toEqual(mockKey);
  });

  it('should throw NotFoundError when key does not exist', async () => {
    const query = new GetKeyQuery('key-1', 'user-1');

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockRepository.findKeyById.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow('Key not found');
  });

  it('should throw when user lacks key access', async () => {
    const query = new GetKeyQuery('key-1', 'user-1');

    mockAccessService.verifyKeyAccess.mockRejectedValue(
      new Error('Not authorized to access this key')
    );

    await expect(handler.execute(query)).rejects.toThrow('Not authorized to access this key');
    expect(mockRepository.findKeyById).not.toHaveBeenCalled();
  });
});
