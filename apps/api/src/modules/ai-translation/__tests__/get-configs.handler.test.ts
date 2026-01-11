import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { GetConfigsHandler } from '../queries/get-configs.handler.js';
import { GetConfigsQuery } from '../queries/get-configs.query.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';

describe('GetConfigsHandler', () => {
  const mockRepository: { getConfigs: ReturnType<typeof vi.fn> } = {
    getConfigs: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetConfigsHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return configs when user has access', async () => {
    const handler = createHandler();

    const configs = [
      {
        id: 'config-1',
        provider: 'OPENAI',
        model: 'gpt-5-mini',
        keyPrefix: 'sk-12345...',
        isActive: true,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'config-2',
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4-5',
        keyPrefix: 'sk-ant-...',
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getConfigs.mockResolvedValue(configs);

    const query = new GetConfigsQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockRepository.getConfigs).toHaveBeenCalledWith('project-1');
    expect(result.configs).toEqual(configs);
  });

  it('should throw when user does not have access', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new GetConfigsQuery('project-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');

    expect(mockRepository.getConfigs).not.toHaveBeenCalled();
  });

  it('should return empty array when no configs exist', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getConfigs.mockResolvedValue([]);

    const query = new GetConfigsQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(result.configs).toEqual([]);
  });
});
