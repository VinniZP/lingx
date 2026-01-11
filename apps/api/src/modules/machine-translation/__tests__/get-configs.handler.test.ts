import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import { GetConfigsHandler } from '../queries/get-configs.handler.js';
import { GetConfigsQuery } from '../queries/get-configs.query.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('GetConfigsHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    getConfigs: vi.fn(),
  };

  const createHandler = () =>
    new GetConfigsHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConfigs = [
    {
      id: 'config-1',
      provider: 'DEEPL' as const,
      keyPrefix: 'deepl-ke...',
      isActive: true,
      priority: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'config-2',
      provider: 'GOOGLE_TRANSLATE' as const,
      keyPrefix: 'AIzaSyB2...',
      isActive: false,
      priority: 1,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  it('should return configs when user has project access', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getConfigs.mockResolvedValue(mockConfigs);

    const handler = createHandler();
    const query = new GetConfigsQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(result.configs).toEqual(mockConfigs);
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockRepository.getConfigs).toHaveBeenCalledWith('project-1');
  });

  it('should return empty array when no configs exist', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getConfigs.mockResolvedValue([]);

    const handler = createHandler();
    const query = new GetConfigsQuery('project-1', 'user-1');

    const result = await handler.execute(query);

    expect(result.configs).toEqual([]);
  });

  it('should throw ForbiddenError when user has no project access', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Not authorized to access this project')
    );

    const handler = createHandler();
    const query = new GetConfigsQuery('project-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow(AppError);
    await expect(handler.execute(query)).rejects.toMatchObject({ statusCode: 403 });
  });
});
