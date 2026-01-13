import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import { GetQualityConfigHandler } from '../queries/get-quality-config.handler.js';
import { GetQualityConfigQuery } from '../queries/get-quality-config.query.js';

describe('GetQualityConfigHandler', () => {
  const mockQualityService: { getConfig: ReturnType<typeof vi.fn> } = {
    getConfig: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetQualityConfigHandler(
      mockQualityService as unknown as QualityEstimationService,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return config when authorized', async () => {
    const handler = createHandler();

    const config = {
      aiEvaluationEnabled: true,
      aiEvaluationProvider: 'OPENAI',
      aiEvaluationModel: 'gpt-4o-mini',
      minScoreForHeuristic: 80,
    };

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockQualityService.getConfig.mockResolvedValue(config);

    const query = new GetQualityConfigQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockQualityService.getConfig).toHaveBeenCalledWith('project-1');
    expect(result).toEqual(config);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new GetQualityConfigQuery('project-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');

    expect(mockQualityService.getConfig).not.toHaveBeenCalled();
  });
});
