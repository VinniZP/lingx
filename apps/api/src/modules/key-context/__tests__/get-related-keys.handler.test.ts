import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type {
  KeyContextService,
  RelatedKeysResult,
} from '../../../services/key-context.service.js';
import { GetRelatedKeysHandler } from '../queries/get-related-keys.handler.js';
import { GetRelatedKeysQuery } from '../queries/get-related-keys.query.js';

describe('GetRelatedKeysHandler', () => {
  const mockKeyContextService: { getRelatedKeys: ReturnType<typeof vi.fn> } = {
    getRelatedKeys: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
    verifyKeyInBranch: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
    verifyKeyInBranch: vi.fn(),
  };

  const createHandler = () =>
    new GetRelatedKeysHandler(
      mockKeyContextService as unknown as KeyContextService,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return related keys when user is authorized', async () => {
    const handler = createHandler();

    const mockKey = {
      id: 'key-1',
      name: 'common.button.save',
      namespace: null,
    };

    const mockRelationships: RelatedKeysResult = {
      sameFile: [
        {
          id: 'key-2',
          name: 'common.button.cancel',
          namespace: null,
          relationshipType: 'SAME_FILE',
          confidence: 0.85,
          sourceFile: 'src/Button.tsx',
          sourceComponent: null,
        },
      ],
      sameComponent: [],
      semantic: [],
      nearby: [],
      keyPattern: [],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockAccessService.verifyKeyInBranch.mockResolvedValue(mockKey);
    mockKeyContextService.getRelatedKeys.mockResolvedValue(mockRelationships);

    const query = new GetRelatedKeysQuery(
      'branch-1',
      'key-1',
      ['SAME_FILE', 'SAME_COMPONENT'],
      10,
      false,
      'user-1'
    );

    const result = await handler.execute(query);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockAccessService.verifyKeyInBranch).toHaveBeenCalledWith('user-1', 'key-1', 'branch-1');
    expect(mockKeyContextService.getRelatedKeys).toHaveBeenCalledWith('key-1', {
      types: ['SAME_FILE', 'SAME_COMPONENT'],
      limit: 10,
      includeTranslations: false,
    });

    expect(result.key).toEqual({
      id: 'key-1',
      name: 'common.button.save',
      namespace: null,
    });
    expect(result.relationships).toEqual(mockRelationships);
  });

  it('should throw ForbiddenError when user is not authorized', async () => {
    const handler = createHandler();

    const forbiddenError = new ForbiddenError();
    mockAccessService.verifyBranchAccess.mockRejectedValue(forbiddenError);

    const query = new GetRelatedKeysQuery(
      'branch-1',
      'key-1',
      undefined,
      undefined,
      undefined,
      'user-1'
    );

    await expect(handler.execute(query)).rejects.toBe(forbiddenError);

    expect(mockAccessService.verifyKeyInBranch).not.toHaveBeenCalled();
    expect(mockKeyContextService.getRelatedKeys).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when key does not exist', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    const notFoundError = new NotFoundError('Key');
    mockAccessService.verifyKeyInBranch.mockRejectedValue(notFoundError);

    const query = new GetRelatedKeysQuery(
      'branch-1',
      'key-1',
      undefined,
      undefined,
      undefined,
      'user-1'
    );

    await expect(handler.execute(query)).rejects.toBe(notFoundError);

    expect(mockKeyContextService.getRelatedKeys).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when key belongs to different branch', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    // verifyKeyInBranch throws NotFoundError if key doesn't belong to branch
    const notFoundError = new NotFoundError('Key');
    mockAccessService.verifyKeyInBranch.mockRejectedValue(notFoundError);

    const query = new GetRelatedKeysQuery(
      'branch-1',
      'key-1',
      undefined,
      undefined,
      undefined,
      'user-1'
    );

    await expect(handler.execute(query)).rejects.toBe(notFoundError);

    expect(mockKeyContextService.getRelatedKeys).not.toHaveBeenCalled();
  });

  it('should propagate service exceptions', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockAccessService.verifyKeyInBranch.mockResolvedValue({
      id: 'key-1',
      name: 'test.key',
      namespace: null,
    });
    mockKeyContextService.getRelatedKeys.mockRejectedValue(new Error('Database connection failed'));

    const query = new GetRelatedKeysQuery(
      'branch-1',
      'key-1',
      undefined,
      undefined,
      undefined,
      'user-1'
    );

    await expect(handler.execute(query)).rejects.toThrow('Database connection failed');
  });

  it('should include translations when requested', async () => {
    const handler = createHandler();

    const mockKey = {
      id: 'key-1',
      name: 'common.button.save',
      namespace: 'common',
    };

    const mockRelationships: RelatedKeysResult = {
      sameFile: [],
      sameComponent: [],
      semantic: [],
      nearby: [],
      keyPattern: [],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockAccessService.verifyKeyInBranch.mockResolvedValue(mockKey);
    mockKeyContextService.getRelatedKeys.mockResolvedValue(mockRelationships);

    const query = new GetRelatedKeysQuery(
      'branch-1',
      'key-1',
      undefined,
      undefined,
      true,
      'user-1'
    );

    await handler.execute(query);

    expect(mockKeyContextService.getRelatedKeys).toHaveBeenCalledWith('key-1', {
      types: undefined,
      limit: undefined,
      includeTranslations: true,
    });
  });
});
