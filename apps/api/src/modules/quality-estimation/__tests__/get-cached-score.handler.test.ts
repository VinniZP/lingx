import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import { GetCachedScoreHandler } from '../queries/get-cached-score.handler.js';
import { GetCachedScoreQuery } from '../queries/get-cached-score.query.js';

describe('GetCachedScoreHandler', () => {
  const mockQualityService: { getCachedScore: ReturnType<typeof vi.fn> } = {
    getCachedScore: vi.fn(),
  };

  const mockAccessService: { verifyTranslationAccess: ReturnType<typeof vi.fn> } = {
    verifyTranslationAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetCachedScoreHandler(
      mockQualityService as unknown as QualityEstimationService,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached score when authorized', async () => {
    const handler = createHandler();

    const cachedScore = {
      score: 85,
      accuracy: 90,
      fluency: 80,
      issues: [],
      evaluationType: 'ai' as const,
    };

    mockAccessService.verifyTranslationAccess.mockResolvedValue(undefined);
    mockQualityService.getCachedScore.mockResolvedValue(cachedScore);

    const query = new GetCachedScoreQuery('translation-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyTranslationAccess).toHaveBeenCalledWith(
      'user-1',
      'translation-1'
    );
    expect(mockQualityService.getCachedScore).toHaveBeenCalledWith('translation-1');
    expect(result).toEqual(cachedScore);
  });

  it('should return null when no cached score exists', async () => {
    const handler = createHandler();

    mockAccessService.verifyTranslationAccess.mockResolvedValue(undefined);
    mockQualityService.getCachedScore.mockResolvedValue(null);

    const query = new GetCachedScoreQuery('translation-1', 'user-1');

    const result = await handler.execute(query);

    expect(result).toBeNull();
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyTranslationAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new GetCachedScoreQuery('translation-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');

    expect(mockQualityService.getCachedScore).not.toHaveBeenCalled();
  });
});
