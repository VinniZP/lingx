import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { KeyContextService } from '../../../services/key-context.service.js';
import { GetContextStatsHandler } from '../queries/get-context-stats.handler.js';
import { GetContextStatsQuery } from '../queries/get-context-stats.query.js';

describe('GetContextStatsHandler', () => {
  const mockKeyContextService: { getRelationshipStats: ReturnType<typeof vi.fn> } = {
    getRelationshipStats: vi.fn(),
  };

  const mockAccessService: { verifyBranchAccess: ReturnType<typeof vi.fn> } = {
    verifyBranchAccess: vi.fn(),
  };

  const createHandler = () =>
    new GetContextStatsHandler(
      mockKeyContextService as unknown as KeyContextService,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return context stats when user is authorized', async () => {
    const handler = createHandler();

    const mockStats = {
      sameFile: 42,
      sameComponent: 15,
      semantic: 8,
      nearby: 23,
      keyPattern: 12,
      keysWithSource: 100,
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockKeyContextService.getRelationshipStats.mockResolvedValue(mockStats);

    const query = new GetContextStatsQuery('branch-1', 'user-1');

    const result = await handler.execute(query);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockKeyContextService.getRelationshipStats).toHaveBeenCalledWith('branch-1');

    expect(result).toEqual(mockStats);
  });

  it('should throw ForbiddenError when user is not authorized', async () => {
    const handler = createHandler();

    const forbiddenError = new ForbiddenError();
    mockAccessService.verifyBranchAccess.mockRejectedValue(forbiddenError);

    const query = new GetContextStatsQuery('branch-1', 'user-1');

    await expect(handler.execute(query)).rejects.toBe(forbiddenError);

    expect(mockKeyContextService.getRelationshipStats).not.toHaveBeenCalled();
  });

  it('should propagate service exceptions', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockKeyContextService.getRelationshipStats.mockRejectedValue(
      new Error('Database connection failed')
    );

    const query = new GetContextStatsQuery('branch-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow('Database connection failed');
  });

  it('should return zero stats for empty branch', async () => {
    const handler = createHandler();

    const emptyStats = {
      sameFile: 0,
      sameComponent: 0,
      semantic: 0,
      nearby: 0,
      keyPattern: 0,
      keysWithSource: 0,
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue({
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en'],
    });
    mockKeyContextService.getRelationshipStats.mockResolvedValue(emptyStats);

    const query = new GetContextStatsQuery('branch-1', 'user-1');

    const result = await handler.execute(query);

    expect(result).toEqual(emptyStats);
  });
});
