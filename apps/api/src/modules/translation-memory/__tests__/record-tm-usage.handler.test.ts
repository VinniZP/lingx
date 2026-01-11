import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import { RecordTMUsageCommand } from '../commands/record-tm-usage.command.js';
import { RecordTMUsageHandler } from '../commands/record-tm-usage.handler.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';

// Mock the queue module
vi.mock('../../../lib/queues.js', () => ({
  translationMemoryQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
}));

// Import after mock
import { translationMemoryQueue } from '../../../lib/queues.js';

describe('RecordTMUsageHandler', () => {
  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository: { entryBelongsToProject: ReturnType<typeof vi.fn> } = {
    entryBelongsToProject: vi.fn(),
  };

  let handler: RecordTMUsageHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new RecordTMUsageHandler(
      mockAccessService as unknown as AccessService,
      mockRepository as unknown as TranslationMemoryRepository
    );
  });

  it('should verify project access before recording usage', async () => {
    const command = new RecordTMUsageCommand('project-1', 'user-1', 'tm-entry-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.entryBelongsToProject.mockResolvedValue(true);

    await handler.execute(command);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
  });

  it('should validate entry belongs to project', async () => {
    const command = new RecordTMUsageCommand('project-1', 'user-1', 'tm-entry-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.entryBelongsToProject.mockResolvedValue(true);

    await handler.execute(command);

    expect(mockRepository.entryBelongsToProject).toHaveBeenCalledWith('tm-entry-1', 'project-1');
  });

  it('should throw NotFoundError when entry does not belong to project', async () => {
    const command = new RecordTMUsageCommand('project-1', 'user-1', 'tm-entry-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.entryBelongsToProject.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow('Translation memory entry not found');
    expect(translationMemoryQueue.add).not.toHaveBeenCalled();
  });

  it('should queue usage recording job', async () => {
    const command = new RecordTMUsageCommand('project-1', 'user-1', 'tm-entry-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.entryBelongsToProject.mockResolvedValue(true);

    const result = await handler.execute(command);

    expect(translationMemoryQueue.add).toHaveBeenCalledWith('update-usage', {
      type: 'update-usage',
      projectId: 'project-1',
      entryId: 'tm-entry-1',
    });
    expect(result).toEqual({ success: true });
  });

  it('should throw when user lacks project access', async () => {
    const command = new RecordTMUsageCommand('project-1', 'user-1', 'tm-entry-1');

    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new Error('Access to this project is not allowed')
    );

    await expect(handler.execute(command)).rejects.toThrow('Access to this project is not allowed');
    expect(mockRepository.entryBelongsToProject).not.toHaveBeenCalled();
    expect(translationMemoryQueue.add).not.toHaveBeenCalled();
  });

  it('should propagate queue failure error', async () => {
    const command = new RecordTMUsageCommand('project-1', 'user-1', 'tm-entry-1');

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.entryBelongsToProject.mockResolvedValue(true);
    vi.mocked(translationMemoryQueue.add).mockRejectedValue(new Error('Queue connection failed'));

    await expect(handler.execute(command)).rejects.toThrow('Queue connection failed');
  });
});
