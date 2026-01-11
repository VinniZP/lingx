import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoveBySourceKeyCommand } from '../commands/remove-by-source-key.command.js';
import { RemoveBySourceKeyHandler } from '../commands/remove-by-source-key.handler.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';

describe('RemoveBySourceKeyHandler', () => {
  const mockRepository: { deleteBySourceKey: ReturnType<typeof vi.fn> } = {
    deleteBySourceKey: vi.fn(),
  };

  const mockLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  } = {
    info: vi.fn(),
    error: vi.fn(),
  };

  let handler: RemoveBySourceKeyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new RemoveBySourceKeyHandler(
      mockRepository as unknown as TranslationMemoryRepository,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should delete TM entries by source key', async () => {
    const command = new RemoveBySourceKeyCommand('key-1');

    mockRepository.deleteBySourceKey.mockResolvedValue(5);

    const result = await handler.execute(command);

    expect(mockRepository.deleteBySourceKey).toHaveBeenCalledWith('key-1');
    expect(result).toEqual({ deletedCount: 5 });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { keyId: 'key-1', deletedCount: 5 },
      '[TM] Removed entries for deleted key'
    );
  });

  it('should not log when no entries were deleted', async () => {
    const command = new RemoveBySourceKeyCommand('key-nonexistent');

    mockRepository.deleteBySourceKey.mockResolvedValue(0);

    const result = await handler.execute(command);

    expect(mockRepository.deleteBySourceKey).toHaveBeenCalledWith('key-nonexistent');
    expect(result).toEqual({ deletedCount: 0 });
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should log error and propagate repository errors', async () => {
    const command = new RemoveBySourceKeyCommand('key-1');

    mockRepository.deleteBySourceKey.mockRejectedValue(new Error('Database error'));

    await expect(handler.execute(command)).rejects.toThrow('Database error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      { keyId: 'key-1', error: 'Database error' },
      '[TM] Failed to remove entries for key'
    );
  });
});
