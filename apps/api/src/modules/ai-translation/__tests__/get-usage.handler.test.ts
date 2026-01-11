import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { GetUsageHandler } from '../queries/get-usage.handler.js';
import { GetUsageQuery } from '../queries/get-usage.query.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';

describe('GetUsageHandler', () => {
  const mockRepository: { getUsage: ReturnType<typeof vi.fn> } = {
    getUsage: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetUsageHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return usage stats when user has access', async () => {
    const handler = createHandler();

    const stats = [
      {
        provider: 'OPENAI',
        model: 'gpt-5-mini',
        currentMonth: {
          inputTokens: 10000,
          outputTokens: 5000,
          requestCount: 100,
          cacheHits: 20,
          estimatedCost: 0.0375,
        },
        allTime: {
          inputTokens: 100000,
          outputTokens: 50000,
          requestCount: 1000,
        },
      },
    ];

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getUsage.mockResolvedValue(stats);

    const query = new GetUsageQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockRepository.getUsage).toHaveBeenCalledWith('project-1');
    expect(result.providers).toEqual(stats);
  });

  it('should throw when user does not have access', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new GetUsageQuery('project-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');

    expect(mockRepository.getUsage).not.toHaveBeenCalled();
  });

  it('should return empty array when no usage exists', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getUsage.mockResolvedValue([]);

    const query = new GetUsageQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(result.providers).toEqual([]);
  });
});
