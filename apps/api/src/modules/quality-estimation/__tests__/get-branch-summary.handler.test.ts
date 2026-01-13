import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import { GetBranchSummaryHandler } from '../queries/get-branch-summary.handler.js';
import { GetBranchSummaryQuery } from '../queries/get-branch-summary.query.js';

describe('GetBranchSummaryHandler', () => {
  const mockQualityService: { getBranchSummary: ReturnType<typeof vi.fn> } = {
    getBranchSummary: vi.fn(),
  };

  const mockAccessService: { verifyBranchAccess: ReturnType<typeof vi.fn> } = {
    verifyBranchAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetBranchSummaryHandler(
      mockQualityService as unknown as QualityEstimationService,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return branch summary when authorized', async () => {
    const handler = createHandler();

    const summary = {
      totalTranslations: 100,
      evaluatedTranslations: 80,
      averageScore: 85,
      scoreDistribution: {
        excellent: 30,
        good: 40,
        fair: 5,
        poor: 5,
      },
      byLanguage: {
        de: { averageScore: 88, count: 40 },
        fr: { averageScore: 82, count: 40 },
      },
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de', 'fr'],
    });
    mockQualityService.getBranchSummary.mockResolvedValue(summary);

    const query = new GetBranchSummaryQuery('branch-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockQualityService.getBranchSummary).toHaveBeenCalledWith('branch-1');
    expect(result).toEqual(summary);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new GetBranchSummaryQuery('branch-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');

    expect(mockQualityService.getBranchSummary).not.toHaveBeenCalled();
  });
});
