import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../access/access.service.js';
import type { AIContextResult, KeyContextService } from '../key-context.service.js';
import { GetAIContextHandler } from '../queries/get-ai-context.handler.js';
import { GetAIContextQuery } from '../queries/get-ai-context.query.js';

describe('GetAIContextHandler', () => {
  const mockKeyContextService: { getAIContext: ReturnType<typeof vi.fn> } = {
    getAIContext: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
    verifyKeyInBranch: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
    verifyKeyInBranch: vi.fn(),
  };

  const createHandler = () =>
    new GetAIContextHandler(
      mockKeyContextService as unknown as KeyContextService,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return AI context when user is authorized', async () => {
    const handler = createHandler();

    const mockContext: AIContextResult = {
      relatedTranslations: [
        {
          keyName: 'common.button.cancel',
          translations: { en: 'Cancel', de: 'Abbrechen' },
          relationshipType: 'SAME_FILE',
          confidence: 0.85,
          isApproved: true,
        },
      ],
      suggestedTerms: [],
      contextPrompt: '<related_keys>...</related_keys>',
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    });
    mockAccessService.verifyKeyInBranch.mockResolvedValue({
      id: 'key-1',
      name: 'common.button.save',
      namespace: null,
    });
    mockKeyContextService.getAIContext.mockResolvedValue(mockContext);

    const query = new GetAIContextQuery('branch-1', 'key-1', 'de', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockAccessService.verifyKeyInBranch).toHaveBeenCalledWith('user-1', 'key-1', 'branch-1');
    expect(mockKeyContextService.getAIContext).toHaveBeenCalledWith('key-1', 'de', 'en');

    expect(result).toEqual(mockContext);
  });

  it('should throw ForbiddenError when user is not authorized', async () => {
    const handler = createHandler();

    const forbiddenError = new ForbiddenError();
    mockAccessService.verifyBranchAccess.mockRejectedValue(forbiddenError);

    const query = new GetAIContextQuery('branch-1', 'key-1', 'de', 'user-1');

    await expect(handler.execute(query)).rejects.toBe(forbiddenError);

    expect(mockAccessService.verifyKeyInBranch).not.toHaveBeenCalled();
    expect(mockKeyContextService.getAIContext).not.toHaveBeenCalled();
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

    const query = new GetAIContextQuery('branch-1', 'key-1', 'de', 'user-1');

    await expect(handler.execute(query)).rejects.toBe(notFoundError);

    expect(mockKeyContextService.getAIContext).not.toHaveBeenCalled();
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

    const query = new GetAIContextQuery('branch-1', 'key-1', 'de', 'user-1');

    await expect(handler.execute(query)).rejects.toBe(notFoundError);

    expect(mockKeyContextService.getAIContext).not.toHaveBeenCalled();
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
    mockKeyContextService.getAIContext.mockRejectedValue(new Error('AI service unavailable'));

    const query = new GetAIContextQuery('branch-1', 'key-1', 'de', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('AI service unavailable');
  });

  it('should fallback to "en" if project has no defaultLanguage', async () => {
    const handler = createHandler();

    const mockContext: AIContextResult = {
      relatedTranslations: [],
      suggestedTerms: [],
      contextPrompt: '',
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: null,
      languages: ['fr'],
    });
    mockAccessService.verifyKeyInBranch.mockResolvedValue({
      id: 'key-1',
      name: 'test.key',
      namespace: null,
    });
    mockKeyContextService.getAIContext.mockResolvedValue(mockContext);

    const query = new GetAIContextQuery('branch-1', 'key-1', 'fr', 'user-1');

    await handler.execute(query);

    expect(mockKeyContextService.getAIContext).toHaveBeenCalledWith('key-1', 'fr', 'en');
  });

  it('should use project source language for different target languages', async () => {
    const handler = createHandler();

    const mockContext: AIContextResult = {
      relatedTranslations: [],
      suggestedTerms: [],
      contextPrompt: '',
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'de',
      languages: ['de', 'ja'],
    });
    mockAccessService.verifyKeyInBranch.mockResolvedValue({
      id: 'key-1',
      name: 'test.key',
      namespace: null,
    });
    mockKeyContextService.getAIContext.mockResolvedValue(mockContext);

    const query = new GetAIContextQuery('branch-1', 'key-1', 'ja', 'user-1');

    await handler.execute(query);

    expect(mockKeyContextService.getAIContext).toHaveBeenCalledWith('key-1', 'ja', 'de');
  });
});
