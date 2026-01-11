import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import { QueuePreTranslateCommand } from '../commands/queue-pre-translate.command.js';
import { QueuePreTranslateHandler } from '../commands/queue-pre-translate.handler.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

// Mock the queue
vi.mock('../../../lib/queues.js', () => ({
  mtBatchQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-456' }),
  },
}));

describe('QueuePreTranslateHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    getProject: vi.fn(),
    getBranchKeysWithSourceTranslations: vi.fn(),
  };

  const createHandler = () =>
    new QueuePreTranslateHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue pre-translation job when user is MANAGER', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.getProject.mockResolvedValue({ id: 'project-1', defaultLanguage: 'en' });
    mockRepository.getBranchKeysWithSourceTranslations.mockResolvedValue([
      { id: 'key-1', translations: [{ value: 'Hello' }] },
      { id: 'key-2', translations: [{ value: 'World' }] },
    ]);

    const handler = createHandler();
    const command = new QueuePreTranslateCommand('project-1', 'user-1', {
      branchId: 'branch-1',
      targetLanguages: ['de', 'fr'],
    });

    const result = await handler.execute(command);

    expect(result).toEqual({
      message: 'Pre-translation queued',
      jobId: 'job-456',
      totalKeys: 2,
      targetLanguages: ['de', 'fr'],
      estimatedCharacters: 20, // (5 + 5) * 2 languages
    });
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
  });

  it('should throw NotFoundError when project not found', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.getProject.mockResolvedValue(null);

    const handler = createHandler();
    const command = new QueuePreTranslateCommand('project-1', 'user-1', {
      branchId: 'branch-1',
      targetLanguages: ['de'],
    });

    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should throw ForbiddenError when user is not MANAGER or OWNER', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Insufficient permissions')
    );

    const handler = createHandler();
    const command = new QueuePreTranslateCommand('project-1', 'user-1', {
      branchId: 'branch-1',
      targetLanguages: ['de'],
    });

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should handle empty branch with no keys', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.getProject.mockResolvedValue({ id: 'project-1', defaultLanguage: 'en' });
    mockRepository.getBranchKeysWithSourceTranslations.mockResolvedValue([]);

    const handler = createHandler();
    const command = new QueuePreTranslateCommand('project-1', 'user-1', {
      branchId: 'branch-1',
      targetLanguages: ['de', 'fr'],
    });

    const result = await handler.execute(command);

    expect(result).toEqual({
      message: 'Pre-translation queued',
      jobId: 'job-456',
      totalKeys: 0,
      targetLanguages: ['de', 'fr'],
      estimatedCharacters: 0,
    });
  });

  it('should return warning when some keys have no source translation', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.getProject.mockResolvedValue({ id: 'project-1', defaultLanguage: 'en' });
    mockRepository.getBranchKeysWithSourceTranslations.mockResolvedValue([
      { id: 'key-1', translations: [{ value: 'Hello' }] },
      { id: 'key-2', translations: [{ value: null }] }, // No source translation
      { id: 'key-3', translations: [] }, // Empty translations array
    ]);

    const handler = createHandler();
    const command = new QueuePreTranslateCommand('project-1', 'user-1', {
      branchId: 'branch-1',
      targetLanguages: ['de'],
    });

    const result = await handler.execute(command);

    expect(result).toEqual({
      message: 'Pre-translation queued',
      jobId: 'job-456',
      totalKeys: 3,
      targetLanguages: ['de'],
      estimatedCharacters: 5, // Only 'Hello' (5) * 1 language
      warning: '2 key(s) have no source translation and will be skipped',
    });
  });
});
