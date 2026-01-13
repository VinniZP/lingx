import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';
import { GetKeyIssuesHandler } from '../queries/get-key-issues.handler.js';
import { GetKeyIssuesQuery } from '../queries/get-key-issues.query.js';

describe('GetKeyIssuesHandler', () => {
  const mockQualityService: { getKeyQualityIssues: ReturnType<typeof vi.fn> } = {
    getKeyQualityIssues: vi.fn(),
  };

  const mockAccessService: { verifyKeyAccess: ReturnType<typeof vi.fn> } = {
    verifyKeyAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetKeyIssuesHandler(
      mockQualityService as unknown as QualityEstimationService,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return issues when authorized', async () => {
    const handler = createHandler();

    const issues = {
      de: [{ type: 'accuracy', severity: 'major', message: 'Translation differs from source' }],
      fr: [{ type: 'terminology', severity: 'minor', message: 'Glossary term not used' }],
    };

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockQualityService.getKeyQualityIssues.mockResolvedValue(issues);

    const query = new GetKeyIssuesQuery('key-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyKeyAccess).toHaveBeenCalledWith('user-1', 'key-1');
    expect(mockQualityService.getKeyQualityIssues).toHaveBeenCalledWith('key-1');
    expect(result).toEqual({ issues });
  });

  it('should return empty issues object when no issues exist', async () => {
    const handler = createHandler();

    mockAccessService.verifyKeyAccess.mockResolvedValue(undefined);
    mockQualityService.getKeyQualityIssues.mockResolvedValue({});

    const query = new GetKeyIssuesQuery('key-1', 'user-1');

    const result = await handler.execute(query);

    expect(result).toEqual({ issues: {} });
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyKeyAccess.mockRejectedValue(new Error('Forbidden'));

    const query = new GetKeyIssuesQuery('key-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Forbidden');

    expect(mockQualityService.getKeyQualityIssues).not.toHaveBeenCalled();
  });
});
