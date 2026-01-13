import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../access/access.service.js';
import { GetUsageHandler } from '../queries/get-usage.handler.js';
import { GetUsageQuery } from '../queries/get-usage.query.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('GetUsageHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    getUsage: vi.fn(),
  };

  const createHandler = () =>
    new GetUsageHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUsageStats = [
    {
      provider: 'DEEPL' as const,
      currentMonth: {
        characterCount: 10000,
        requestCount: 50,
        cachedCount: 20,
        estimatedCost: 0.2,
      },
      allTime: {
        characterCount: 50000,
        requestCount: 250,
      },
    },
  ];

  it('should return usage stats when user has project access', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getUsage.mockResolvedValue(mockUsageStats);

    const handler = createHandler();
    const query = new GetUsageQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(result.providers).toEqual(mockUsageStats);
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockRepository.getUsage).toHaveBeenCalledWith('project-1');
  });

  it('should return empty array when no providers configured', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getUsage.mockResolvedValue([]);

    const handler = createHandler();
    const query = new GetUsageQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(result.providers).toEqual([]);
  });

  it('should throw ForbiddenError when user has no project access', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to access this project')
    );

    const handler = createHandler();
    const query = new GetUsageQuery('project-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 403 });
  });
});
