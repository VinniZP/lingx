import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateTMUsageCommand } from '../commands/update-tm-usage.command.js';
import { UpdateTMUsageHandler } from '../commands/update-tm-usage.handler.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';

describe('UpdateTMUsageHandler', () => {
  const mockRepository: { recordUsage: ReturnType<typeof vi.fn> } = {
    recordUsage: vi.fn(),
  };

  const mockLogger: {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  } = {
    warn: vi.fn(),
    error: vi.fn(),
  };

  let handler: UpdateTMUsageHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateTMUsageHandler(
      mockRepository as unknown as TranslationMemoryRepository,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should update usage count for existing entry', async () => {
    const command = new UpdateTMUsageCommand('tm-entry-1');

    mockRepository.recordUsage.mockResolvedValue(true);

    await handler.execute(command);

    expect(mockRepository.recordUsage).toHaveBeenCalledWith('tm-entry-1');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should log warning when entry not found', async () => {
    const command = new UpdateTMUsageCommand('tm-entry-missing');

    mockRepository.recordUsage.mockResolvedValue(false);

    await handler.execute(command);

    expect(mockRepository.recordUsage).toHaveBeenCalledWith('tm-entry-missing');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { entryId: 'tm-entry-missing' },
      '[TM] Entry not found for usage update'
    );
  });

  it('should log error and propagate repository errors', async () => {
    const command = new UpdateTMUsageCommand('tm-entry-1');

    mockRepository.recordUsage.mockRejectedValue(new Error('Database error'));

    await expect(handler.execute(command)).rejects.toThrow('Database error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      { entryId: 'tm-entry-1', error: 'Database error' },
      '[TM] Failed to update usage count'
    );
  });
});
