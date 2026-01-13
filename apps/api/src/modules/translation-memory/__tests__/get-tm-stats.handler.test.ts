import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import { GetTMStatsHandler } from '../queries/get-tm-stats.handler.js';
import { GetTMStatsQuery } from '../queries/get-tm-stats.query.js';
import type {
  TMStats,
  TranslationMemoryRepository,
} from '../repositories/translation-memory.repository.js';

describe('GetTMStatsHandler', () => {
  const mockRepository: {
    getStats: ReturnType<typeof vi.fn>;
  } = {
    getStats: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  let handler: GetTMStatsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetTMStatsHandler(
      mockRepository as unknown as TranslationMemoryRepository,
      mockAccessService as unknown as AccessService
    );
  });

  it('should verify project access before fetching stats', async () => {
    const query = new GetTMStatsQuery('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getStats.mockResolvedValue({
      totalEntries: 0,
      languagePairs: [],
    });

    await handler.execute(query);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
  });

  it('should return TM stats from repository', async () => {
    const query = new GetTMStatsQuery('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);

    const mockStats: TMStats = {
      totalEntries: 150,
      languagePairs: [
        { sourceLanguage: 'en', targetLanguage: 'de', count: 100 },
        { sourceLanguage: 'en', targetLanguage: 'fr', count: 50 },
      ],
    };
    mockRepository.getStats.mockResolvedValue(mockStats);

    const result = await handler.execute(query);

    expect(mockRepository.getStats).toHaveBeenCalledWith('project-1');
    expect(result).toEqual(mockStats);
  });

  it('should return empty stats when no TM entries exist', async () => {
    const query = new GetTMStatsQuery('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);

    const emptyStats: TMStats = {
      totalEntries: 0,
      languagePairs: [],
    };
    mockRepository.getStats.mockResolvedValue(emptyStats);

    const result = await handler.execute(query);

    expect(result).toEqual(emptyStats);
  });

  it('should throw when user lacks project access', async () => {
    const query = new GetTMStatsQuery('project-1', 'user-1');

    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new Error('Access to this project is not allowed')
    );

    await expect(handler.execute(query)).rejects.toThrow('Access to this project is not allowed');
    expect(mockRepository.getStats).not.toHaveBeenCalled();
  });
});
