import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import { GetContextConfigHandler } from '../queries/get-context-config.handler.js';
import { GetContextConfigQuery } from '../queries/get-context-config.query.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';

describe('GetContextConfigHandler', () => {
  const mockRepository: { getContextConfig: ReturnType<typeof vi.fn> } = {
    getContextConfig: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetContextConfigHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return context config when user has access', async () => {
    const handler = createHandler();

    const config = {
      includeGlossary: true,
      glossaryLimit: 10,
      includeTM: true,
      tmLimit: 5,
      tmMinSimilarity: 0.7,
      includeRelatedKeys: true,
      relatedKeysLimit: 5,
      includeDescription: true,
      customInstructions: null,
    };

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getContextConfig.mockResolvedValue(config);

    const query = new GetContextConfigQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockRepository.getContextConfig).toHaveBeenCalledWith('project-1');
    expect(result).toEqual(config);
  });

  it('should throw when user does not have access', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new GetContextConfigQuery('project-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');

    expect(mockRepository.getContextConfig).not.toHaveBeenCalled();
  });
});
