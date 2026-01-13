import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../access/access.service.js';
import { QueueBatchTranslateCommand } from '../commands/queue-batch-translate.command.js';
import { QueueBatchTranslateHandler } from '../commands/queue-batch-translate.handler.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

// Mock the queue
vi.mock('../../../lib/queues.js', () => ({
  mtBatchQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  },
}));

describe('QueueBatchTranslateHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    getProject: vi.fn(),
    getKeysWithSourceTranslations: vi.fn(),
  };

  const createHandler = () =>
    new QueueBatchTranslateHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue batch translation job', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getProject.mockResolvedValue({ id: 'project-1', defaultLanguage: 'en' });
    mockRepository.getKeysWithSourceTranslations.mockResolvedValue([
      { id: 'key-1', translations: [{ value: 'Hello' }] },
      { id: 'key-2', translations: [{ value: 'World' }] },
    ]);

    const handler = createHandler();
    const command = new QueueBatchTranslateCommand('project-1', 'user-1', {
      keyIds: ['key-1', 'key-2'],
      targetLanguage: 'de',
    });

    const result = await handler.execute(command);

    expect(result).toEqual({
      message: 'Batch translation queued',
      jobId: 'job-123',
      totalKeys: 2,
      estimatedCharacters: 10, // 'Hello' (5) + 'World' (5)
    });
    expect(mockRepository.getKeysWithSourceTranslations).toHaveBeenCalledWith(
      ['key-1', 'key-2'],
      'en'
    );
  });

  it('should throw NotFoundError when project not found', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getProject.mockResolvedValue(null);

    const handler = createHandler();
    const command = new QueueBatchTranslateCommand('project-1', 'user-1', {
      keyIds: ['key-1'],
      targetLanguage: 'de',
    });

    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should throw ForbiddenError when user has no access', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(new ForbiddenError('Not authorized'));

    const handler = createHandler();
    const command = new QueueBatchTranslateCommand('project-1', 'user-1', {
      keyIds: ['key-1'],
      targetLanguage: 'de',
    });

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should handle empty keyIds array', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getProject.mockResolvedValue({ id: 'project-1', defaultLanguage: 'en' });
    mockRepository.getKeysWithSourceTranslations.mockResolvedValue([]);

    const handler = createHandler();
    const command = new QueueBatchTranslateCommand('project-1', 'user-1', {
      keyIds: [],
      targetLanguage: 'de',
    });

    const result = await handler.execute(command);

    expect(result).toEqual({
      message: 'Batch translation queued',
      jobId: 'job-123',
      totalKeys: 0,
      estimatedCharacters: 0,
    });
  });

  it('should return warning when some keys have no source translation', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MEMBER' });
    mockRepository.getProject.mockResolvedValue({ id: 'project-1', defaultLanguage: 'en' });
    mockRepository.getKeysWithSourceTranslations.mockResolvedValue([
      { id: 'key-1', translations: [{ value: 'Hello' }] },
      { id: 'key-2', translations: [{ value: null }] }, // No source translation
      { id: 'key-3', translations: [] }, // Empty translations array
    ]);

    const handler = createHandler();
    const command = new QueueBatchTranslateCommand('project-1', 'user-1', {
      keyIds: ['key-1', 'key-2', 'key-3'],
      targetLanguage: 'de',
    });

    const result = await handler.execute(command);

    expect(result).toEqual({
      message: 'Batch translation queued',
      jobId: 'job-123',
      totalKeys: 3,
      estimatedCharacters: 5, // Only 'Hello' (5)
      warning: '2 key(s) have no source translation and will be skipped',
    });
  });
});
